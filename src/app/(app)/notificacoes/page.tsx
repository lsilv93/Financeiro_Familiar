"use client";
import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, PageHeader, Spinner } from "@/components/ui";

type N = { id: string; type: string; title: string; body: string; read: boolean; createdAt: string; request: { id: string; status: "PENDING" | "APPROVED" | "REJECTED"; name: string; email: string; role: string | null } | null };

const when = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default function NotificacoesPage() {
  const { data, error, loading, reload } = useApi<{ unread: number; items: N[] }>("/api/notifications");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Marca como lidas ao abrir (as de pedido de acesso só saem do contador quando respondidas).
  useEffect(() => {
    if (!data || data.unread === 0) return;
    const ids = data.items.filter((n) => !n.read && !(n.request && n.request.status === "PENDING")).map((n) => n.id);
    if (ids.length) api("/api/notifications/read", { method: "POST", body: { ids } }).then(() => reload()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.items.length]);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id); setErr(null);
    try { await api(`/api/join-requests/${id}`, { method: "POST", body: { action } }); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erro"); } finally { setBusy(null); }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Notificações" subtitle="Pedidos de acesso e avisos da família" />
      {(error || err) && <ErrorBox message={(error || err)!} />}
      {loading && !data && <Spinner className="my-16" />}
      {data && data.items.length === 0 && <Empty>Nenhuma notificação por enquanto.</Empty>}
      <div className="stagger space-y-4">
        {data?.items.map((n) => (
          <div key={n.id} className="card !p-[18px]">
            <div className="flex items-start gap-3">
              <span className={`chip ${n.read ? "text-t3" : "text-lime"}`}><Icon name="bell" size={18} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2"><span className="text-[14px] font-semibold text-fg">{n.title}</span><span className="mono text-[10px] text-t4">{when(n.createdAt)}</span></div>
                <p className="mt-1 text-[13px] leading-relaxed text-t2">{n.body}</p>
                {n.request && (
                  <div className="well mt-3 space-y-3">
                    <div className="text-[12px] text-t3"><b className="text-fg">{n.request.name}</b> · {n.request.email}{n.request.role ? ` · ${n.request.role}` : ""}</div>
                    {n.request.status === "PENDING" ? (
                      <>
                        <p className="text-[11px] text-t4">Ao aceitar, essa pessoa passa a ver os lançamentos <b>familiares</b> da família. Os pessoais de cada um continuam privados.</p>
                        <div className="flex gap-3">
                          <button className="btn-primary flex-1" disabled={busy === n.request.id} onClick={() => decide(n.request!.id, "approve")}>Aceitar</button>
                          <button className="btn-secondary flex-1" disabled={busy === n.request.id} onClick={() => decide(n.request!.id, "reject")}>Recusar</button>
                        </div>
                      </>
                    ) : (
                      <span className={`badge ${n.request.status === "APPROVED" ? "badge-lime" : "badge-danger"}`}>{n.request.status === "APPROVED" ? "Aceito" : "Recusado"}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
