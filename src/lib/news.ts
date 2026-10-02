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

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  laquo: "«", raquo: "»", bull: "•", middot: "·", copy: "©", reg: "®", euro: "€", deg: "°", ordm: "º", ordf: "ª", sect: "§", trade: "™",
  aacute: "á", agrave: "à", acirc: "â", atilde: "ã", auml: "ä", aring: "å", ccedil: "ç", eacute: "é", egrave: "è", ecirc: "ê", euml: "ë",
  iacute: "í", igrave: "ì", icirc: "î", iuml: "ï", ntilde: "ñ", oacute: "ó", ograve: "ò", ocirc: "ô", otilde: "õ", ouml: "ö", uacute: "ú",
  ugrave: "ù", ucirc: "û", uuml: "ü", yacute: "ý",
  Aacute: "Á", Agrave: "À", Acirc: "Â", Atilde: "Ã", Ccedil: "Ç", Eacute: "É", Egrave: "È", Ecirc: "Ê", Iacute: "Í", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Uacute: "Ú", Uuml: "Ü",
};

/** Decodifica entidades HTML (numéricas e nomeadas) — feeds costumam trazer texto "escapado" duas vezes. */
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const cp = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(cp) && cp > 8 && cp < 0x110000 && !(cp >= 0xd800 && cp <= 0xdfff) ? String.fromCodePoint(cp) : "";
    }
    return NAMED[e] ?? NAMED[e.toLowerCase()] ?? m;
  });
}

/** Corrige texto UTF-8 que foi lido como Latin-1 ("NotÃ­cia" -> "Notícia"). */
export function fixMojibake(s: string): string {
  if (!/[ÃÂ][\u0080-\u00BF]/.test(s)) return s;
  try {
    const fixed = Buffer.from(s, "latin1").toString("utf8");
    return !fixed.includes("\uFFFD") && (fixed.match(/[ÃÂ]/g)?.length ?? 0) < (s.match(/[ÃÂ]/g)?.length ?? 0) ? fixed : s;
  } catch {
    return s;
  }
}

/** Texto limpo para exibir: sem tags, sem entidades, sem caracteres estranhos/invisíveis. */
export function cleanText(raw: string): string {
  let t = raw.replace(/<!\[CDATA\[|\]\]>/g, "");
  t = decodeEntities(t);
  t = t.replace(/<[^>]*>/g, " "); // tags (inclusive as que vieram escapadas)
  t = decodeEntities(t); // 2ª passada: &amp;amp; etc.
  t = fixMojibake(t);
  t = t.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\u00AD\uFEFF\uFFFD]/g, "");
  return t.replace(/\s+/g, " ").trim();
}

/** Resumo curto (corta em palavra inteira e ignora se só repete o título). */
export function shorten(s: string, max: number, title = ""): string {
  if (!s) return "";
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9à-ú]/g, "");
  if (title && norm(s).startsWith(norm(title).slice(0, 40))) s = s.slice(Math.min(s.length, title.length)).replace(/^[\s:–—-]+/, "");
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 40)).replace(/[\s,;:–—-]+$/, "") + "…";
}

/** Decodifica o corpo conforme o charset do cabeçalho ou da declaração XML (Folha usa ISO-8859-1). */
export function decodeBody(buf: Uint8Array, contentType = ""): string {
  let label = /charset=["']?([\w-]+)/i.exec(contentType)?.[1];
  if (!label) {
    const head = new TextDecoder("latin1").decode(buf.slice(0, 300));
    label = /encoding=["']([\w-]+)["']/i.exec(head)?.[1];
  }
  label = (label ?? "utf-8").toLowerCase();
  if (label === "iso-8859-1" || label === "latin1" || label === "us-ascii") label = "windows-1252";
  try {
    return new TextDecoder(label).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

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
    const title = cleanText(text(it.title));
    let link = text(it.link);
    if (!link && it.link && typeof it.link === "object") link = String((it.link as Record<string, unknown>)["@_href"] ?? "");
    if (!link) link = text(it.guid);
    if (!title || !/^https?:\/\//i.test(link)) continue;
    const summary = shorten(cleanText(text(it.description) || text(it.summary) || text(it["content:encoded"]) || ""), 130, title);
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

async function readLimited(r: Response): Promise<Uint8Array> {
  const declared = Number(r.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) throw new Error("resposta muito grande");
  if (!r.body) return new Uint8Array();
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
  return Buffer.concat(chunks);
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let current = new URL(url);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isSafeUrl(current)) throw new Error("destino não permitido");
      const r = await fetch(current, {
        signal: ctrl.signal,
        redirect: "manual",
        cache: "no-store", // o cache diário fica no banco (lib/dailyCache)
        headers: { "User-Agent": "Mozilla/5.0 (compatible; FinanceiroFamiliar/1.0)", Accept: "application/rss+xml, application/xml, text/xml, application/json, */*" },
      });
      if (r.status >= 300 && r.status < 400 && r.headers.get("location")) {
        current = new URL(r.headers.get("location")!, current);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return decodeBody(await readLimited(r), r.headers.get("content-type") ?? "");
    }
    throw new Error("redirecionamentos demais");
  } finally {
    clearTimeout(t);
  }
}

export const CATEGORY_ORDER: NewsCategory[] = ["dolar", "inflacao", "investimentos", "brasil"];
const PER_CATEGORY = 3;
const MAX_AGE_MS = 4 * 86400000; // só notícias dos últimos 4 dias

/** Escolhe só as principais: até 3 por assunto, mais recentes, no máximo 2 do mesmo veículo. */
export function pickTop(items: NewsItem[]): Record<NewsCategory, NewsItem[]> {
  const out = { dolar: [], inflacao: [], investimentos: [], brasil: [] } as Record<NewsCategory, NewsItem[]>;
  const now = Date.now();
  const recent = items.filter((n) => !n.published || now - new Date(n.published).getTime() < MAX_AGE_MS);
  const sorted = [...recent].sort((a, b) => (b.published ?? "").localeCompare(a.published ?? ""));
  const seenTitles = new Set<string>();
  for (const n of sorted) {
    const key = n.title.toLowerCase().slice(0, 50);
    if (seenTitles.has(key)) continue;
    const list = out[n.category];
    if (list.length >= PER_CATEGORY || list.filter((x) => x.source === n.source).length >= 2) continue;
    list.push(n);
    seenTitles.add(key);
  }
  return out;
}

export async function loadNews() {
  const results = await Promise.allSettled(SOURCES.map(async (s) => parseFeed(await fetchText(s.url), s.name).slice(0, 25)));
  const items: NewsItem[] = [];
  const sources = results.map((r, i) => {
    if (r.status === "fulfilled") items.push(...r.value);
    return { name: SOURCES[i].name, ok: r.status === "fulfilled" && r.value.length > 0 };
  });
  return { top: pickTop(items), sources };
}

// ---------- indicadores de mercado (valores do dia) ----------
export type Indicator = { code: string; name: string; group: "cambio" | "juros" | "bolsa"; value: number; unit: "BRL" | "%" | "% a.a." | "pts" | "USD"; pct: number | null; date: string | null; note?: string };

const num = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));

async function awesome(): Promise<Indicator[]> {
  const j = JSON.parse(await fetchText("https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL", 6000)) as Record<string, { bid: string; pctChange: string; create_date?: string }>;
  const defs: [string, string, string, Indicator["group"], Indicator["unit"]][] = [["USDBRL", "USDBRL", "Dólar", "cambio", "BRL"], ["EURBRL", "EURBRL", "Euro", "cambio", "BRL"], ["BTCBRL", "BTCBRL", "Bitcoin", "cambio", "BRL"]];
  return defs.flatMap(([k, code, name, group, unit]) => {
    const v = j[k];
    return v && Number.isFinite(num(v.bid)) ? [{ code, name, group, value: num(v.bid), unit, pct: Number.isFinite(num(v.pctChange)) ? num(v.pctChange) : null, date: v.create_date?.slice(0, 10) ?? null }] : [];
  });
}

async function bcb(): Promise<Indicator[]> {
  const defs: { serie: number; code: string; name: string; unit: Indicator["unit"]; note?: string }[] = [
    { serie: 432, code: "SELIC", name: "Selic (meta)", unit: "% a.a." },
    { serie: 4389, code: "CDI", name: "CDI", unit: "% a.a." },
    { serie: 433, code: "IPCA", name: "IPCA do mês", unit: "%" },
    { serie: 13522, code: "IPCA12", name: "IPCA 12 meses", unit: "%" },
    { serie: 189, code: "IGPM", name: "IGP-M do mês", unit: "%" },
  ];
  const res = await Promise.all(
    defs.map(async (d) => {
      try {
        const [row] = JSON.parse(await fetchText(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${d.serie}/dados/ultimos/1?formato=json`, 6000)) as { data: string; valor: string }[];
        const [dd, mm, yy] = row.data.split("/");
        const value = num(row.valor);
        return Number.isFinite(value) ? ({ code: d.code, name: d.name, group: "juros", value, unit: d.unit, pct: null, date: `${yy}-${mm}-${dd}` } as Indicator) : null;
      } catch {
        return null;
      }
    }),
  );
  return res.filter((x): x is Indicator => !!x);
}

async function yahoo(): Promise<Indicator[]> {
  const defs: [string, string, string, Indicator["unit"]][] = [["%5EBVSP", "IBOV", "Ibovespa", "pts"], ["%5EGSPC", "SP500", "S&P 500", "pts"], ["GC%3DF", "OURO", "Ouro (onça)", "USD"]];
  const res = await Promise.all(
    defs.map(async ([sym, code, name, unit]) => {
      try {
        const j = JSON.parse(await fetchText(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=5d&interval=1d`, 6000)) as { chart?: { result?: { meta: { regularMarketPrice?: number; chartPreviousClose?: number; previousClose?: number; regularMarketTime?: number } }[] } };
        const m = j.chart?.result?.[0]?.meta;
        const value = num(m?.regularMarketPrice);
        const prev = num(m?.chartPreviousClose ?? m?.previousClose);
        if (!Number.isFinite(value)) return null;
        return { code, name, group: "bolsa", value, unit, pct: Number.isFinite(prev) && prev ? ((value - prev) / prev) * 100 : null, date: m?.regularMarketTime ? new Date(m.regularMarketTime * 1000).toISOString().slice(0, 10) : null } as Indicator;
      } catch {
        return null;
      }
    }),
  );
  return res.filter((x): x is Indicator => !!x);
}

export async function loadMarket(): Promise<{ indicators: Indicator[] }> {
  const parts = await Promise.allSettled([awesome(), bcb(), yahoo()]);
  return { indicators: parts.flatMap((p) => (p.status === "fulfilled" ? p.value : [])) };
}
