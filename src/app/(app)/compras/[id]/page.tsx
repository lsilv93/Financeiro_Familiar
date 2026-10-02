"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, brl, fmtDate, useApi } from "@/lib/client";
import { EXPENSE_CATEGORIES, PAYMENT_METHODS } from "@/lib/categories";
import type { Card } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Modal, SectionTitle, Spinner } from "@/components/ui";

type Item = { id: string; name: string; quantity: string | null; bought: boolean; boughtBy: string | null; boughtAt: string | null };
type Res = {
  list: { id: string; code: string; name: string; status: "OPEN" | "CLOSED"; createdBy: string; createdAt: string; closedAt: string | null };
  items: Item[];
  purchases: { key: string; boughtBy: string; boughtAt: string; amount: number | null; paymentMethod: string | null; category: string | null; items: string[] }[];
};
type Method = keyof typeof PAYMENT_METHODS;
type Check = { level: "OK" | "RESERVE" | "NEGATIVE"; projectedAfter: number };

export default function ListaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, loading, reload } = useApi<Res>(`/api/shopping/lists/${id}`);
  const { data: cards } = useApi<Card[]>("/api/cards");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [pay, setPay] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("PIX");
  const [cardId, setCardId] = useState("");
  const [category, setCategory] = useState("ALIMENTACAO");
  const [sub, setSub] = useState("Mercado");
  const [warn, setWarn] = useState<Check | null>(null);
  const [busy, setBusy] = useState(false);
  const [delItem, setDelItem] = useState<Item | null>(null);
  const [delList, setDelList] = useState(false);

  // Atualiza sozinho: outro membro pode ter comprado itens enquanto você olha a lista.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible" && !pay) reload(); }, 8000);
    return () => clearInterval(t);
  }, [reload, pay]);
  // Itens já comprados por outra pessoa saem da seleção.
  useEffect(() => { if (data) setSel((s) => new Set([...s].filter((i) => data.items.some((x) => x.id === i && !x.bought)))); }, [data]);

  const open = data?.list.status === "OPEN";
  const pending = data?.items.filter((i) => !i.bought) ?? [];
  const done = data?.items.filter((i) => i.bought) ?? [];
  const activeCards = (cards ?? []).filter((c) => c.active);
  const value = Number(amount.replace(",", ".")) || 0;
  const toggle = (iid: string) => setSel((s) => { const n = new Set(s); if (n.has(iid)) n.delete(iid); else n.add(iid); return n; });

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    try { await api(`/api/shopping/lists/${id}/items`, { method: "POST", body: { name, quantity: qty || null } }); setName(""); setQty(""); reload(); }
    catch (x) { setErr(x instanceof Error ? x.message : "Erro"); }
  }
  async function checkWarn(v: number) {
    if (!(v > 0)) return setWarn(null);
    try {
      const c = await api<Check>("/api/budget-check", { method: "POST", body: { scope: "FAMILY", amount: v, date: new Date().toISOString().slice(0, 10), category, paymentMethod: method === "CREDIT" ? "PIX" : method } });
      setWarn(c.level === "OK" ? null : c);
    } catch { setWarn(null); }
  }
  async function finish(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return setErr("Informe o valor total da compra");
    setBusy(true); setErr(null);
    try {
      const r = await api<{ items: number; closed: boolean }>(`/api/shopping/lists/${id}/checkout`, {
        method: "POST", body: { itemIds: [...sel], amount: value, paymentMethod: method, cardId: method === "CREDIT" ? cardId || activeCards[0]?.id : null, category, subcategory: sub || null, scope: "FAMILY" },
      });
      setPay(false); setSel(new Set()); setAmount(""); setWarn(null);
      setMsg(r.closed ? `Compra finalizada e lista encerrada (100% comprada)! A despesa de ${brl(value)} foi lançada.` : `Compra finalizada! ${r.items} item(ns) saíram da seleção e a despesa de ${brl(value)} foi lançada.`);
      await reload();
    } catch (x) { setErr(x instanceof Error ? x.message : "Erro"); await reload(); } finally { setBusy(false); }
  }
  async function removeItem() {
    if (!delItem) return;
    const it = delItem; setDelItem(null);
    try { await api(`/api/shopping/items/${it.id}`, { method: "DELETE" }); reload(); } catch (x) { setErr(x instanceof Error ? x.message : "Erro"); reload(); }
  }
  async function removeList() {
    setDelList(false);
    try { await api(`/api/shopping/lists/${id}`, { method: "DELETE" }); router.push("/compras"); } catch (x) { setErr(x instanceof Error ? x.message : "Erro"); }
  }

  if (error) return <div><ErrorBox message={error} /><Link href="/compras" className="btn-secondary">Voltar às listas</Link></div>;
  if (loading && !data) return <Spinner className="my-16" />;
  if (!data) return null;
  const pct = data.items.length ? Math.round((done.length / data.items.length) * 100) : 0;

  return (
    <div>
      <Link href="/compras" className="btn-ghost btn-xs mb-3">‹ Todas as listas</Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] leading-tight text-fg">{data.list.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2"><span className="badge mono">{data.list.code}</span><span className={`badge ${open ? "badge-gold" : "badge-lime"}`}>{open ? "Pendente" : "Encerrada"}</span><span className="text-[12px] text-t3">criada por {data.list.createdBy} em {fmtDate(data.list.createdAt)}</span></div>
        </div>
        <button className="btn-ghost btn-xs hover:!text-danger" onClick={() => setDelList(true)}><Icon name="trash" size={15} />Excluir lista</button>
      </div>

      <div className="card mb-5 !p-[18px]">
        <div className="mono mb-1.5 flex justify-between text-[12px] text-t3"><span>{done.length} de {data.items.length} comprados</span><span>{pct}%</span></div>
        <div className="track"><div className="fill" style={{ width: `${pct}%` }} /></div>
      </div>

      {open && (
        <form onSubmit={add} className="card mb-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input aria-label="Item" className="input flex-1" placeholder="Adicionar item. Ex.: Arroz" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
            <input aria-label="Quantidade" className="input sm:!w-36" placeholder="Qtd. (opcional)" maxLength={30} value={qty} onChange={(e) => setQty(e.target.value)} />
            <button className="btn-primary" disabled={!name.trim()}><Icon name="plus" size={16} />Adicionar</button>
          </div>
        </form>
      )}

      {(err && !pay) && <ErrorBox message={err} />}
      {msg && <div className="well mb-4 text-[13px] leading-relaxed text-lime" role="status">{msg} <Link href="/despesas" className="font-semibold underline">Ver em Despesas</Link></div>}

      <div className="card mb-5">
        <SectionTitle right={open && pending.length > 0 ? <button className="btn-ghost btn-xs" onClick={() => setSel(sel.size === pending.length ? new Set() : new Set(pending.map((p) => p.id)))}>{sel.size === pending.length ? "Desmarcar todos" : "Marcar todos"}</button> : undefined}>Itens da lista</SectionTitle>
        {data.items.length === 0 ? <Empty>A lista está vazia. Adicione os itens acima.</Empty> : (
          <ul className="rows">
            {[...pending, ...done].map((i) => (
              <li key={i.id} className={`flex items-center gap-3 py-3 ${i.bought ? "opacity-60" : ""}`}>
                <input type="checkbox" className="check" aria-label={i.bought ? `${i.name} (já comprado)` : `Marcar ${i.name} como comprado`} disabled={i.bought || !open} checked={i.bought || sel.has(i.id)} onChange={() => toggle(i.id)} />
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-[14px] font-semibold ${i.bought ? "text-t3 line-through" : "text-fg"}`}>{i.name}{i.quantity ? <span className="ml-2 text-[12px] font-normal text-t3">{i.quantity}</span> : null}</div>
                  {i.bought && <div className="text-[11px] text-t4">Comprado{i.boughtBy ? ` por ${i.boughtBy}` : ""}{i.boughtAt ? ` em ${fmtDate(i.boughtAt)}` : ""}</div>}
                </div>
                {!i.bought && open && <button className="btn-ghost !min-h-[36px] !px-2 hover:!text-danger" aria-label={`Remover ${i.name}`} onClick={() => setDelItem(i)}><Icon name="trash" size={16} /></button>}
              </li>
            ))}
          </ul>
        )}
        {open && pending.length > 0 && <p className="mt-3 text-[11px] text-t4">Marque os itens que já comprou e toque em “Finalizar compra”. Itens finalizados não podem mais ser selecionados.</p>}
      </div>

      {data.purchases.length > 0 && (
        <div className="card">
          <SectionTitle>Compras finalizadas</SectionTitle>
          <ul className="space-y-3">
            {data.purchases.map((p) => (
              <li key={p.key} className="well">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[12px]"><span className="text-t3">{p.boughtBy} · {fmtDate(p.boughtAt)}{p.paymentMethod ? ` · ${PAYMENT_METHODS[p.paymentMethod as Method]}` : ""}{p.category ? ` · ${EXPENSE_CATEGORIES[p.category]?.label ?? p.category}` : ""}</span><span className="mono font-semibold text-fg">{p.amount !== null ? brl(p.amount) : "—"}</span></div>
                <div className="mt-2 text-[13px] leading-relaxed text-t2">{p.items.join(", ")}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {open && sel.size > 0 && (
        <div className="fixed inset-x-3 bottom-24 z-30 md:bottom-6 md:left-[17rem] md:right-8">
          <div className="card mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 !rounded-[26px] !p-4">
            <span className="text-[13px] text-t2"><b className="mono text-fg">{sel.size}</b> {sel.size === 1 ? "item marcado" : "itens marcados"}</span>
            <div className="flex gap-2"><button className="btn-ghost btn-xs" onClick={() => setSel(new Set())}>Limpar</button><button className="btn-primary" onClick={() => { setErr(null); setAmount(""); setWarn(null); setPay(true); }}>Finalizar compra</button></div>
          </div>
        </div>
      )}

      <Modal open={pay} onClose={() => setPay(false)} title="Finalizar compra">
        <form onSubmit={finish} className="space-y-4">
          <h2 className="text-[18px] font-semibold text-fg">Finalizar compra</h2>
          <p className="text-[13px] leading-relaxed text-t3">{sel.size} {sel.size === 1 ? "item será marcado" : "itens serão marcados"} como comprado{sel.size === 1 ? "" : "s"} e o valor entra em <b className="text-t2">Despesas</b> na categoria escolhida.</p>
          {err && <ErrorBox message={err} />}
          <div><label className="label" htmlFor="tv">Valor total (R$)</label><input id="tv" className="input mono" inputMode="decimal" autoFocus required placeholder="0,00" value={amount} onChange={(e) => { setAmount(e.target.value); checkWarn(Number(e.target.value.replace(",", ".")) || 0); }} /></div>
          <div>
            <span className="label">Como pagou</span>
            <div className="seg grid w-full grid-cols-2 !rounded-[26px] sm:grid-cols-4 sm:!rounded-full">{(Object.keys(PAYMENT_METHODS) as Method[]).map((m) => <button type="button" key={m} className={`seg-btn ${method === m ? "on" : ""}`} onClick={() => setMethod(m)}>{PAYMENT_METHODS[m]}</button>)}</div>
          </div>
          {method === "CREDIT" && (
            <div><label className="label" htmlFor="tc">Cartão</label>
              {activeCards.length === 0 ? <p className="well-gold text-[13px] text-gold">Cadastre um cartão em Cartões para usar o crédito.</p> : <select id="tc" className="input" value={cardId || activeCards[0].id} onChange={(e) => setCardId(e.target.value)}>{activeCards.map((c) => <option key={c.id} value={c.id}>{c.name} · vence dia {c.dueDay}</option>)}</select>}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label" htmlFor="tcat">Categoria da despesa</label><select id="tcat" className="input" value={category} onChange={(e) => { setCategory(e.target.value); setSub(e.target.value === "ALIMENTACAO" ? "Mercado" : ""); }}>{Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></div>
            {EXPENSE_CATEGORIES[category].subs.length > 0 && <div><label className="label" htmlFor="tsub">Subcategoria</label><select id="tsub" className="input" value={sub} onChange={(e) => setSub(e.target.value)}><option value="">—</option>{EXPENSE_CATEGORIES[category].subs.map((s) => <option key={s}>{s}</option>)}</select></div>}
          </div>
          {warn && <div className="well-gold text-[12px] leading-relaxed text-gold">Atenção: este gasto {warn.level === "NEGATIVE" ? "deixa o orçamento do mês negativo" : "compromete sua reserva de emergência"} (saldo projetado: {brl(warn.projectedAfter)}). Você ainda pode confirmar.</div>}
          <div className="flex gap-3"><button type="button" className="btn-secondary flex-1" onClick={() => setPay(false)}>Cancelar</button><button className="btn-primary flex-1" disabled={busy}>{busy ? "Registrando..." : "Confirmar compra"}</button></div>
        </form>
      </Modal>

      <Modal open={!!delItem} onClose={() => setDelItem(null)} title="Remover item">
        {delItem && (
          <div className="space-y-4">
            <h2 className="text-[18px] font-semibold text-fg">Remover “{delItem.name}” da lista?</h2>
            <div className="flex flex-col gap-3 sm:flex-row-reverse"><button className="btn-danger flex-1" onClick={removeItem}>Remover</button><button className="btn-secondary flex-1" onClick={() => setDelItem(null)}>Cancelar</button></div>
          </div>
        )}
      </Modal>
      <Modal open={delList} onClose={() => setDelList(false)} title="Excluir lista">
        <div className="space-y-4">
          <span className="chip !h-12 !w-12 !rounded-[18px] text-danger"><Icon name="trash" size={22} /></span>
          <h2 className="text-[18px] font-semibold text-fg">Excluir a lista “{data.list.name}”?</h2>
          <p className="text-[13px] leading-relaxed text-t3">Todos os {data.items.length} itens serão apagados. As despesas já lançadas continuam em Despesas.</p>
          <div className="flex flex-col gap-3 sm:flex-row-reverse"><button className="btn-danger flex-1" onClick={removeList}>Sim, excluir lista</button><button className="btn-secondary flex-1" onClick={() => setDelList(false)}>Cancelar</button></div>
        </div>
      </Modal>
    </div>
  );
}
