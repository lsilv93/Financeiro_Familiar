import { XMLParser } from "fast-xml-parser";

export type NewsCategory = "dolar" | "inflacao" | "investimentos" | "brasil";
export type NewsItem = { title: string; link: string; source: string; published: string | null; summary: string; category: NewsCategory };

/** Fontes de notícias financeiras (feeds RSS públicos de veículos conhecidos). */
export const SOURCES = [
  { name: "G1 Economia", url: "https://g1.globo.com/rss/g1/economia/" },
  { name: "InfoMoney", url: "https://www.infomoney.com.br/feed/" },
  { name: "Agência Brasil", url: "https://agenciabrasil.ebc.com.br/rss/economia/feed.xml" },
  { name: "CNN Brasil Economia", url: "https://www.cnnbrasil.com.br/economia/feed/" },
  { name: "Exame", url: "https://exame.com/feed/" },
  { name: "Folha Mercado", url: "https://feeds.folha.uol.com.br/mercado/rss091.xml" },
];

const RULES: [NewsCategory, RegExp][] = [
  ["dolar", /d[óo]lar|c[âa]mbio|euro\b|moeda americana|cota[çc][ãa]o|bitcoin/i],
  ["inflacao", /infla[çc][ãa]o|ipca|igp-?m|inpc|selic|copom|juros|pre[çc]os? (ao|do) consumidor|custo de vida|deflac/i],
  ["investimentos", /investi|renda fixa|tesouro|a[çc][õo]es|bolsa|ibovespa|\bfiis?\b|fundos?|cdb|lci|lca|poupan[çc]a|dividendos|b3\b|cripto/i],
];

export function classify(text: string): NewsCategory {
  for (const [cat, re] of RULES) if (re.test(text)) return cat;
  return "brasil";
}

const stripHtml = (s: string) =>
  s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

const text = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) return String((v as Record<string, unknown>)["#text"]);
  return "";
};

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", processEntities: true, trimValues: true });

/** Converte RSS 2.0 ou Atom em itens normalizados. */
export function parseFeed(xml: string, source: string): NewsItem[] {
  const doc = parser.parse(xml);
  const raw: Record<string, unknown>[] = doc?.rss?.channel?.item ?? doc?.feed?.entry ?? doc?.["rdf:RDF"]?.item ?? [];
  const items = Array.isArray(raw) ? raw : [raw];
  const out: NewsItem[] = [];
  for (const it of items) {
    const title = stripHtml(text(it.title));
    let link = text(it.link);
    if (!link && it.link && typeof it.link === "object") link = String((it.link as Record<string, unknown>)["@_href"] ?? "");
    if (!link) link = text(it.guid);
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const summary = stripHtml(text(it.description) || text(it.summary) || text(it["content:encoded"]) || "").slice(0, 220);
    const dateStr = text(it.pubDate) || text(it.published) || text(it.updated) || text(it["dc:date"]);
    const d = dateStr ? new Date(dateStr) : null;
    out.push({ title, link, source, published: d && !isNaN(d.getTime()) ? d.toISOString() : null, summary, category: classify(`${title} ${summary}`) });
  }
  return out;
}

const MAX_BYTES = 2_000_000; // limite de tamanho de resposta externa (evita consumo excessivo de memória)
const MAX_REDIRECTS = 3;

/** Só segue destinos https de nome de host público (nada de IPs, localhost ou redes internas). */
export function isSafeUrl(u: URL): boolean {
  if (u.protocol !== "https:" || u.username || u.password) return false;
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(":") || /\.(local|internal|lan|home|corp)$/.test(h)) return false;
  return h.includes(".");
}

async function readLimited(r: Response): Promise<string> {
  const declared = Number(r.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("resposta muito grande");
  if (!r.body) return "";
  const reader = r.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error("resposta muito grande");
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8").decode(Buffer.concat(chunks));
}

async function fetchText(url: string, revalidate: number, timeoutMs = 7000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let current = new URL(url);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isSafeUrl(current)) throw new Error("destino não permitido");
      const r = await fetch(current, {
        signal: ctrl.signal,
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FinanceiroFamiliar/1.0)", Accept: "application/rss+xml, application/xml, text/xml, application/json, */*" },
        next: { revalidate },
      });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
        current = new URL(r.headers.get("location")!, current);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await readLimited(r);
    }
    throw new Error("redirecionamentos demais");
  } finally {
    clearTimeout(t);
  }
}

export async function loadNews(limitPerSource = 15) {
  const results = await Promise.allSettled(SOURCES.map(async (s) => parseFeed(await fetchText(s.url, 900), s.name).slice(0, limitPerSource)));
  const items: NewsItem[] = [];
  const sources = results.map((r, i) => {
    if (r.status === "fulfilled") items.push(...r.value);
    return { name: SOURCES[i].name, ok: r.status === "fulfilled" && r.value.length > 0 };
  });
  // remove duplicadas (mesmo link) e ordena da mais recente para a mais antiga
  const seen = new Set<string>();
  const unique = items.filter((n) => (seen.has(n.link) ? false : (seen.add(n.link), true)));
  unique.sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
  return { items: unique, sources };
}

// ---------- indicadores de mercado ----------
export type Quote = { code: string; name: string; bid: number; pct: number | null };
export type Rate = { code: string; name: string; value: number; date: string; unit: string };

export async function loadMarket() {
  const [q, rates] = await Promise.all([
    fetchText("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL", 300, 6000)
      .then((t) => {
        const j = JSON.parse(t) as Record<string, { bid: string; pctChange: string; name: string; code: string }>;
        const names: Record<string, string> = { USDBRL: "Dólar", EURBRL: "Euro", BTCBRL: "Bitcoin" };
        return Object.entries(j).map(([k, v]) => ({ code: k, name: names[k] ?? v.name, bid: Number(v.bid), pct: v.pctChange != null ? Number(v.pctChange) : null }) as Quote);
      })
      .catch(() => [] as Quote[]),
    Promise.all(
      [
        { code: "SELIC", name: "Selic (meta a.a.)", serie: 432, unit: "% a.a." },
        { code: "IPCA", name: "IPCA (mês)", serie: 433, unit: "%" },
        { code: "IPCA12", name: "IPCA (12 meses)", serie: 13522, unit: "%" },
      ].map((s) =>
        fetchText(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${s.serie}/dados/ultimos/1?formato=json`, 3600, 6000)
          .then((t) => {
            const [row] = JSON.parse(t) as { data: string; valor: string }[];
            const [d, m, y] = row.data.split("/");
            return { code: s.code, name: s.name, value: Number(row.valor), date: `${y}-${m}-${d}`, unit: s.unit } as Rate;
          })
          .catch(() => null),
      ),
    ),
  ]);
  return { quotes: q, rates: rates.filter((r): r is Rate => !!r), updatedAt: new Date().toISOString() };
}
