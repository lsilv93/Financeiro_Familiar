"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Modal, PageHeader, Spinner } from "@/components/ui";

type L = { id: string; code: string; name: string; status: "OPEN" | "CLOSED"; createdBy: string; createdAt: string; closedAt: string | null; total: number; bought: number; preview: string[] };
const d = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");

function ListCard({ l, onDelete }: { l: L; onDelete: (l: L) => void }) {
  const pct = l.total ? Math.round((l.bought / l.total) * 100) : 0;
  return (
    <div className="card !p-[18px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-fg">{l.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2"><span className="badge mono">{l.code}</span><span className="text-[11px] text-t4">{l.createdBy} · {d(l.createdAt)}</span></div>
        </div>
        <span className={`badge ${l.status === "OPEN" ? "badge-gold" : "badge-lime"}`}>{l.status === "OPEN" ? "Pendente" : "Encerrada"}</span>
      </div>
      <div className="mono mt-3 flex justify-between text-[11px] text-t3"><span>{l.bought}/{l.total} comprados</span><span>{pct}%</span></div>
      <div className="track mt-1.5"><div className="fill" style={{ width: `${pct}%` }} /></div>
      {l.status === "OPEN" && l.preview.length > 0 && <p className="mt-3 truncate text-[12px] text-t3">Falta: {l.preview.join(", ")}{l.total - l.bought > 3 ? "…" : ""}</p>}
      <div className="mt-4 flex gap-2">
        <Link href={`/compras/${l.id}`} className="btn-primary btn-xs flex-1">{l.status === "OPEN" ? "Abrir lista" : "Ver lista"}</Link>
        <button className="btn-ghost btn-xs hover:!text-danger" aria-label={`Excluir lista ${l.name}`} onClick={() => onDelete(l)}><Icon name="trash" size={15} /></button>
      </div>
    </div>
  );
}

export default function ComprasPage() {
  const router = useRouter();
  const { data, error, loading, reload } = useApi<{ open: L[]; closed: L[] }>("/api/shopping/lists");
  const [tab, setTab] = useState<"OPEN" | "CLOSED">("OPEN");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [del, setDel] = useState<L | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { const r = await api<{ id: string }>("/api/shopping/lists", { method: "POST", body: { name: name || null } }); router.push(`/compras/${r.id}`); }
    catch (x) { setErr(x instanceof Error ? x.message : "Erro"); setBusy(false); }
  }
  async function remove() {
    if (!del) return;
    const l = del; setDel(null);
    try { await api(`/api/shopping/lists/${l.id}`, { method: "DELETE" }); reload(); } catch (x) { setErr(x instanceof Error ? x.message : "Erro"); }
  }

  const list = (tab === "OPEN" ? data?.open : data?.closed) ?? [];
  const term = q.trim().toLowerCase();
  const shown = term ? list.filter((l) => l.code.toLowerCase().includes(term) || l.name.toLowerCase().includes(term)) : list;

  return (
    <div>
      <PageHeader title="Listas de compras" subtitle="Crie listas para a família. Ficam pendentes até comprar tudo" actions={<button className="btn-primary" onClick={() => { setCreating(true); setName(""); setErr(null); }}><Icon name="plus" size={16} />Criar lista</button>} />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="seg" role="tablist">
          <button role="tab" aria-selected={tab === "OPEN"} className="seg-btn" onClick={() => setTab("OPEN")}>Pendentes{data ? <span className="mono ml-1.5 text-[10px] opacity-70">{data.open.length}</span> : null}</button>
          <button role="tab" aria-selected={tab === "CLOSED"} className="seg-btn" onClick={() => setTab("CLOSED")}>Encerradas{data ? <span className="mono ml-1.5 text-[10px] opacity-70">{data.closed.length}</span> : null}</button>
        </div>
        <input aria-label="Buscar lista por nome ou código" className="input sm:!w-64" placeholder="Buscar por nome ou código" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {(error || err) && <ErrorBox message={(error || err)!} />}
      {loading && !data && <Spinner className="my-12" />}
      {data && shown.length === 0 && (
        <Empty>
          {tab === "OPEN" ? <><span>Nenhuma lista pendente. Crie uma para começar a juntar os itens do mercado.</span><button className="btn-primary btn-xs" onClick={() => setCreating(true)}>Criar lista</button></> : "Nenhuma lista encerrada ainda. Uma lista é encerrada quando 100% dos itens são comprados."}
        </Empty>
      )}
      <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{shown.map((l) => <ListCard key={l.id} l={l} onDelete={setDel} />)}</div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Criar lista">
        <form onSubmit={create} className="space-y-4">
          <h2 className="text-[18px] font-semibold text-fg">Nova lista de compras</h2>
          {err && <ErrorBox message={err} />}
          <div><label className="label" htmlFor="ln">Nome da lista <span className="normal-case tracking-normal text-t4">(opcional)</span></label><input id="ln" className="input" autoFocus maxLength={60} placeholder="Ex.: Mercado do mês" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <p className="text-[12px] leading-relaxed text-t4">A lista ganha um código único e fica visível para toda a família.</p>
          <div className="flex gap-3"><button type="button" className="btn-secondary flex-1" onClick={() => setCreating(false)}>Cancelar</button><button className="btn-primary flex-1" disabled={busy}>{busy ? "Criando..." : "Criar lista"}</button></div>
        </form>
      </Modal>
      <Modal open={!!del} onClose={() => setDel(null)} title="Excluir lista">
        {del && (
          <div className="space-y-4">
            <span className="chip !h-12 !w-12 !rounded-[18px] text-danger"><Icon name="trash" size={22} /></span>
            <h2 className="text-[18px] font-semibold text-fg">Excluir a lista “{del.name}”?</h2>
            <p className="text-[13px] leading-relaxed text-t3">Todos os itens da lista ({del.total}) serão apagados. As despesas já lançadas pelas compras continuam em Despesas.</p>
            <div className="flex flex-col gap-3 sm:flex-row-reverse"><button className="btn-danger flex-1" onClick={remove}>Sim, excluir lista</button><button className="btn-secondary flex-1" onClick={() => setDel(null)}>Cancelar</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
