"use client";
import { useApi } from "@/lib/client";
import { fmtIndicator, refDate, type Indicator } from "@/lib/indicators";
import { Empty, ErrorBox, PageHeader, SectionTitle, Spinner } from "@/components/ui";

type Item = { title: string; link: string; source: string; published: string | null; summary: string };
type News = { top: Record<"dolar" | "inflacao" | "investimentos" | "brasil", Item[]>; sources: { name: string; ok: boolean }[]; updatedAt: string | null; stale: boolean };
type Market = { indicators: Indicator[]; updatedAt: string | null; stale: boolean };

const SECTIONS: [keyof News["top"], string][] = [["dolar", "Dólar e câmbio"], ["inflacao", "Inflação e juros"], ["investimentos", "Investimentos"], ["brasil", "Economia do Brasil"]];
const GROUPS: [Indicator["group"], string][] = [["cambio", "Câmbio"], ["juros", "Juros e inflação"], ["bolsa", "Bolsa e investimentos"]];

function ago(iso: string | null) {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `há ${Math.max(1, m)} min`;
  if (m < 1440) return `há ${Math.round(m / 60)} h`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
const stamp = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

export default function NoticiasPage() {
  const news = useApi<News>("/api/news");
  const market = useApi<Market>("/api/market");
  const total = news.data ? Object.values(news.data.top).reduce((a, l) => a + l.length, 0) : 0;

  return (
    <div>
      <PageHeader title="Notícias e indicadores" subtitle="O essencial do dia, atualizado uma vez por dia" />
      {(news.error || market.error) && <ErrorBox message={(news.error || market.error)!} />}

      <section className="mb-6">
        <SectionTitle right={<span className="mono text-[10px] text-t4">Atualizado em {stamp(market.data?.updatedAt ?? null)}</span>}>Indicadores de hoje</SectionTitle>
        {market.loading && !market.data ? <Spinner className="my-8" /> : !market.data?.indicators.length ? (
          <Empty>Os indicadores não estão disponíveis agora. Tente novamente mais tarde.</Empty>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {GROUPS.map(([g, label]) => {
              const list = market.data!.indicators.filter((i) => i.group === g);
              if (!list.length) return null;
              return (
                <div key={g} className="card !p-[18px]">
                  <div className="kicker mb-3">{label}</div>
                  <ul className="space-y-2.5">
                    {list.map((i) => (
                      <li key={i.code} className="well flex items-center justify-between gap-3 !rounded-[16px] !px-4 !py-2.5">
                        <div className="min-w-0"><div className="truncate text-[12px] text-t2">{i.name}</div>{i.date && g === "juros" && <div className="mono text-[10px] text-t4">ref. {refDate(i.date)}</div>}</div>
                        <div className="text-right"><div className="mono text-[14px] font-semibold text-fg">{fmtIndicator(i)}</div>
                          {i.pct !== null && <div className={`mono text-[10px] font-semibold ${i.pct >= 0 ? "text-lime" : "text-danger"}`}>{i.pct >= 0 ? "▲" : "▼"} {Math.abs(i.pct).toFixed(2).replace(".", ",")}%</div>}</div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <SectionTitle>Principais notícias</SectionTitle>
        {news.loading && !news.data ? <Spinner className="my-8" /> : total === 0 ? (
          <Empty>Não foi possível carregar as notícias agora. Tente novamente mais tarde.</Empty>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {SECTIONS.map(([k, label]) => {
              const list = news.data!.top[k];
              if (!list.length) return null;
              return (
                <div key={k} className="card !p-[18px]">
                  <div className="kicker mb-1">{label}</div>
                  <ul className="rows">
                    {list.map((n) => (
                      <li key={n.link} className="py-3">
                        <a href={n.link} target="_blank" rel="noopener noreferrer" className="group block">
                          <div className="text-[14px] font-semibold leading-snug text-fg group-hover:text-lime">{n.title}</div>
                          {n.summary && <p className="mt-1 text-[12px] leading-relaxed text-t3">{n.summary}</p>}
                          <div className="mono mt-1.5 text-[10px] text-t4">{n.source}{n.published ? ` · ${ago(n.published)}` : ""} ↗</div>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-6 text-center text-[11px] leading-relaxed text-t4">
          Atualizado em {stamp(news.data?.updatedAt ?? null)}{news.data?.stale ? " (dados de um acesso anterior: as fontes não responderam hoje)" : ""} · a página se atualiza sozinha 1 vez por dia, no primeiro acesso.
          {news.data?.sources.length ? ` Fontes: ${news.data.sources.filter((s) => s.ok).map((s) => s.name).join(", ") || "indisponíveis"}.` : ""}
        </p>
      </section>
    </div>
  );
}
