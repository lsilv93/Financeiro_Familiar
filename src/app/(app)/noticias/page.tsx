"use client";
import { useState } from "react";
import { useApi } from "@/lib/client";
import { MarketStrip } from "@/components/MarketStrip";
import { Empty, ErrorBox, PageHeader, Spinner } from "@/components/ui";

type Item = { title: string; link: string; source: string; published: string | null; summary: string; category: string };
type Res = { items: Item[]; sources: { name: string; ok: boolean }[]; counts: Record<string, number>; updatedAt: string };

const CATS: [string, string][] = [["", "Todas"], ["dolar", "Dólar e câmbio"], ["inflacao", "Inflação e juros"], ["investimentos", "Investimentos"], ["brasil", "Economia Brasil"]];
const BADGE: Record<string, string> = { dolar: "badge-gold", inflacao: "badge-danger", investimentos: "badge-lime", brasil: "" };
const NAME: Record<string, string> = { dolar: "Dólar", inflacao: "Inflação", investimentos: "Investimentos", brasil: "Brasil" };

function ago(iso: string | null) {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "agora";
  if (m < 60) return `há ${m} min`;
  if (m < 1440) return `há ${Math.round(m / 60)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function NoticiasPage() {
  const [cat, setCat] = useState("");
  const { data, error, loading, reload } = useApi<Res>(`/api/news${cat ? `?cat=${cat}` : ""}`);
  const failed = data?.sources.filter((s) => !s.ok) ?? [];

  return (
    <div>
      <PageHeader title="Notícias" subtitle="Dólar, inflação, investimentos e economia do Brasil" actions={<button className="btn-secondary btn-xs" onClick={reload}>Atualizar</button>} />
      <div className="mb-5"><MarketStrip /></div>

      <div className="mb-5 overflow-x-auto pb-1">
        <div className="seg" role="tablist">
          {CATS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={cat === k} className="seg-btn whitespace-nowrap" onClick={() => setCat(k)}>
              {l}{k && data?.counts[k] ? <span className="mono ml-1.5 text-[10px] opacity-70">{data.counts[k]}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {error && <ErrorBox message={error} />}
      {loading && !data && <Spinner className="my-16" />}
      {data && (
        <>
          {data.items.length === 0 ? (
            <Empty>Não foi possível carregar notícias agora. Tente novamente em alguns minutos.</Empty>
          ) : (
            <div className="stagger grid gap-5 md:grid-cols-2">
              {data.items.map((n) => (
                <a key={n.link} href={n.link} target="_blank" rel="noopener noreferrer" className="card card-link flex flex-col gap-3 !p-[18px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`badge ${BADGE[n.category]}`}>{NAME[n.category]}</span>
                    <span className="mono text-[10px] text-t4">{ago(n.published)}</span>
                  </div>
                  <h2 className="text-[15px] font-semibold leading-snug text-fg">{n.title}</h2>
                  {n.summary && <p className="line-clamp-3 text-[12px] leading-relaxed text-t3">{n.summary}</p>}
                  <span className="mt-auto text-[11px] font-semibold text-lime">{n.source} ↗</span>
                </a>
              ))}
            </div>
          )}
          <p className="mt-6 text-center text-[11px] text-t4">
            Fontes: {data.sources.filter((s) => s.ok).map((s) => s.name).join(", ") || "indisponíveis"}. As matérias abrem no site original.
            {failed.length > 0 && ` Indisponíveis no momento: ${failed.map((f) => f.name).join(", ")}.`}
          </p>
        </>
      )}
    </div>
  );
}
