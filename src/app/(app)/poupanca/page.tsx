"use client";
import { useMemo, useState } from "react";
import { api, brl, fmtDate, todayStr, useApi } from "@/lib/client";
import { AreaLine } from "@/components/charts";
import { PiggyBank } from "@/components/Illustrations";
import { Icon } from "@/components/Icon";
import { Empty, ErrorBox, Modal, PageHeader, ScopeBadge, ScopeTabs, SectionTitle, Spinner } from "@/components/ui";

type Entry = { id: string; kind: "DEPOSIT" | "WITHDRAWAL"; bank: string; amount: number; date: string; note: string | null; scope: "PERSONAL" | "FAMILY"; mine: boolean };
type Res = {
  total: number;
  banks: { bank: string; deposits: number; withdrawals: number; balance: number }[];
  evolution: { month: string; balance: number }[];
  month: { deposited: number; withdrawn: number };
  goal: { personal: number; family: number };
  knownBanks: string[];
  entries: Entry[];
};

const SUGGESTED = ["Banco do Brasil", "Itaú", "Bradesco", "Caixa", "Santander", "Nubank", "Inter", "C6 Bank", "XP", "Mercado Pago", "Sicoob", "Dinheiro guardado"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Form = { kind: "DEPOSIT" | "WITHDRAWAL"; bank: string; amount: string; date: string; note: string; scope: "PERSONAL" | "FAMILY" };

export default function PoupancaPage() {
  const [scope, setScope] = useState("ALL");
  const { data, error, loading, reload } = useApi<Res>(`/api/savings?scope=${scope}`);
  const [form, setForm] = useState<Form | null>(null);
  const [confirmW, setConfirmW] = useState(false);
  const [delTarget, setDelTarget] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const banks = useMemo(() => [...new Set([...(data?.knownBanks ?? []), ...SUGGESTED])], [data]);
  const open = (kind: Form["kind"], bank = "") => { setErr(null); setOkMsg(null); setForm({ kind, bank, amount: "", date: todayStr(), note: "", scope: scope === "FAMILY" ? "FAMILY" : "PERSONAL" }); };
  const value = form ? Number(form.amount.replace(",", ".")) || 0 : 0;

  async function save(confirmed = false) {
    if (!form) return;
    setBusy(true); setErr(null);
    try {
      await api("/api/savings", { method: "POST", body: { ...form, amount: value, confirmed } });
      setOkMsg(form.kind === "DEPOSIT" ? `Aporte de ${brl(value)} registrado. Parabéns por guardar!` : `Resgate de ${brl(value)} registrado.`);
      setForm(null); setConfirmW(false);
      reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "Erro"); setConfirmW(false); } finally { setBusy(false); }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.bank.trim()) return setErr("Informe o banco");
    if (!value) return setErr("Informe um valor maior que zero");
    if (form.kind === "WITHDRAWAL") { setErr(null); setConfirmW(true); } else save();
  }

  async function removeEntry() {
    if (!delTarget) return;
    setBusy(true);
    try { await api(`/api/savings/${delTarget.id}`, { method: "DELETE", body: { confirmed: true } }); setDelTarget(null); setOkMsg("Lançamento removido."); reload(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Erro"); setDelTarget(null); }
    finally { setBusy(false); }
  }

  const goal = scope === "PERSONAL" ? data?.goal.personal : scope === "FAMILY" ? data?.goal.family : (data?.goal.personal ?? 0) + (data?.goal.family ?? 0);
  const goalPct = data && goal ? Math.min(100, (data.total / goal) * 100) : null;

  return (
    <div>
      <PageHeader title="Minha reserva" subtitle="Quanto guardei, onde está e quando resgatei" actions={
        <>
          <button className="btn-primary" onClick={() => open("DEPOSIT")}><Icon name="plus" size={16} />Guardar</button>
          <button className="btn-secondary" onClick={() => open("WITHDRAWAL")}>Resgatar</button>
        </>
      } />
      <div className="mb-5"><ScopeTabs value={scope} onChange={setScope} /></div>

      {error && <ErrorBox message={error} />}
      {err && !form && <ErrorBox message={err} />}
      {okMsg && <div className="well mb-4 text-[13px] text-lime">{okMsg}</div>}
      {loading && !data && <Spinner className="my-16" />}

      {data && (
        <div className="space-y-5">
          <div className="card relative overflow-hidden">
            <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="kicker mb-3">Total guardado</div>
                <div className="well !rounded-[20px] !px-5 !py-4"><div className="mono text-[30px] font-semibold text-lime">{brl(data.total)}</div></div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
                  <div><div className="kicker mb-1">Guardado neste mês</div><div className="mono font-semibold text-fg">+ {brl(data.month.deposited)}</div></div>
                  <div><div className="kicker mb-1">Resgatado neste mês</div><div className="mono font-semibold text-fg">− {brl(data.month.withdrawn)}</div></div>
                </div>
                {goalPct !== null && goal ? (
                  <div className="mt-4">
                    <div className="mb-1.5 flex justify-between text-[11px] text-t3"><span>Meta de reserva (Configurações)</span><span className="mono">{goalPct.toFixed(0)}% de {brl(goal)}</span></div>
                    <div className="track"><div className="fill" style={{ width: `${goalPct}%` }} /></div>
                  </div>
                ) : <p className="mt-4 text-[11px] text-t4">Defina sua meta de reserva em Configurações para acompanhar o progresso aqui.</p>}
              </div>
              <PiggyBank className="mx-auto hidden h-36 w-48 sm:block" />
            </div>
          </div>

          <div>
            <SectionTitle>Por banco</SectionTitle>
            {data.banks.length === 0 ? <Empty>Nenhuma reserva registrada ainda. Clique em “Guardar” para informar o primeiro valor.</Empty> : (
              <div className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {data.banks.map((b) => (
                  <div key={b.bank} className="card !p-[18px]">
                    <div className="flex items-center gap-3"><span className="chip text-lime"><Icon name="bank" size={18} /></span><div className="min-w-0"><div className="truncate text-[14px] font-semibold text-fg">{b.bank}</div><div className="mono text-[10px] text-t4">{data.total > 0 ? ((b.balance / data.total) * 100).toFixed(0) : 0}% da reserva</div></div></div>
                    <div className="well mt-3 !rounded-[18px] !px-4 !py-3"><div className="mono text-[20px] font-semibold text-fg">{brl(b.balance)}</div></div>
                    <div className="track mt-3 !h-2"><div className="fill" style={{ width: `${data.total > 0 ? Math.max(3, (b.balance / data.total) * 100) : 0}%` }} /></div>
                    <div className="mono mt-2 flex justify-between text-[10px] text-t4"><span>+ {brl(b.deposits)}</span><span>− {brl(b.withdrawals)}</span></div>
                    <div className="mt-3 flex gap-2"><button className="btn-primary btn-xs flex-1" onClick={() => open("DEPOSIT", b.bank)}>Guardar</button><button className="btn-secondary btn-xs flex-1" onClick={() => open("WITHDRAWAL", b.bank)}>Resgatar</button></div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {data.evolution.some((e) => e.balance > 0) && (
            <div className="card">
              <SectionTitle>Evolução da reserva (12 meses)</SectionTitle>
              <AreaLine points={data.evolution.map((e) => ({ label: MONTHS[Number(e.month.slice(5)) - 1], value: e.balance }))} />
            </div>
          )}

          <div className="card">
            <SectionTitle>Histórico</SectionTitle>
            {data.entries.length === 0 ? <Empty>Sem movimentações.</Empty> : (
              <ul className="rows">
                {data.entries.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-3.5">
                    <span className={`chip ${e.kind === "DEPOSIT" ? "text-lime" : "text-danger"}`}><Icon name={e.kind === "DEPOSIT" ? "down" : "up"} size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className="truncate text-[14px] font-semibold text-fg">{e.kind === "DEPOSIT" ? "Guardei em" : "Resgatei de"} {e.bank}</span><ScopeBadge scope={e.scope} /></div>
                      <div className="text-[11px] text-t3">{fmtDate(e.date)}{e.note ? ` · ${e.note}` : ""}</div>
                    </div>
                    <div className={`mono shrink-0 text-[14px] font-semibold ${e.kind === "DEPOSIT" ? "text-lime" : "text-fg"}`}>{e.kind === "DEPOSIT" ? "+" : "−"} {brl(e.amount)}</div>
                    <button className="btn-ghost !min-h-[32px] !px-2 hover:!text-danger" aria-label="Remover" onClick={() => setDelTarget(e)}><Icon name="trash" size={16} /></button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* formulário guardar / resgatar */}
      <Modal open={!!form && !confirmW} onClose={() => setForm(null)} title={form?.kind === "DEPOSIT" ? "Guardar na reserva" : "Resgatar da reserva"}>
        {form && (
          <form onSubmit={submit} className="space-y-4">
            <h2 className="text-[18px] font-semibold text-fg">{form.kind === "DEPOSIT" ? "Guardar na reserva" : "Resgatar da reserva"}</h2>
            {err && <ErrorBox message={err} />}
            <div>
              <label className="label" htmlFor="bank">Banco</label>
              <input id="bank" list="banks" className="input" required placeholder="Ex.: Nubank" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} />
              <datalist id="banks">{banks.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label" htmlFor="v">Valor (R$)</label><input id="v" className="input mono" inputMode="decimal" required placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
              <div><label className="label" htmlFor="d">Data</label><input id="d" type="date" className="input mono" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div>
              <span className="label">De quem é</span>
              <div className="seg w-full">
                <button type="button" className={`seg-btn ${form.scope === "PERSONAL" ? "on" : ""}`} onClick={() => setForm({ ...form, scope: "PERSONAL" })}>Pessoal</button>
                <button type="button" className={`seg-btn ${form.scope === "FAMILY" ? "on" : ""}`} onClick={() => setForm({ ...form, scope: "FAMILY" })}>Familiar</button>
              </div>
            </div>
            <div><label className="label" htmlFor="n">Observação <span className="normal-case tracking-normal text-t4">(opcional)</span></label><input id="n" className="input" maxLength={120} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div className="flex gap-3 pt-1">
              <button type="button" className="btn-secondary flex-1" onClick={() => setForm(null)}>Cancelar</button>
              <button className={`${form.kind === "DEPOSIT" ? "btn-primary" : "btn-secondary"} flex-1`} disabled={busy}>{form.kind === "DEPOSIT" ? (busy ? "Salvando..." : "Guardar") : "Continuar"}</button>
            </div>
          </form>
        )}
      </Modal>

      {/* confirmação de resgate */}
      <Modal open={confirmW && !!form} onClose={() => setConfirmW(false)} title="Confirmar resgate">
        {form && (
          <div className="space-y-4">
            <span className="chip !h-12 !w-12 !rounded-[18px] text-gold"><Icon name="alert" size={24} /></span>
            <h2 className="text-[18px] font-semibold text-fg">Tem certeza que quer resgatar?</h2>
            <p className="text-[14px] leading-relaxed text-t2">Você está retirando <b className="mono text-fg">{brl(value)}</b> de <b className="text-fg">{form.bank}</b>. Reserva é para ser guardada e <b>não mexida</b>: use apenas em uma emergência real. Quanto mais tempo guardado, mais tranquilo você fica.</p>
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <button className="btn-primary flex-1" onClick={() => { setConfirmW(false); setForm(null); }}>Manter minha reserva</button>
              <button className="btn-danger flex-1" disabled={busy} onClick={() => save(true)}>{busy ? "Resgatando..." : "Sim, resgatar"}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* confirmação de exclusão */}
      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title="Remover lançamento">
        {delTarget && (
          <div className="space-y-4">
            <span className="chip !h-12 !w-12 !rounded-[18px] text-gold"><Icon name="alert" size={24} /></span>
            <h2 className="text-[18px] font-semibold text-fg">Tem certeza que quer remover?</h2>
            <p className="text-[14px] leading-relaxed text-t2">Isto apagará {delTarget.kind === "DEPOSIT" ? "o aporte" : "o resgate"} de <b className="mono text-fg">{brl(delTarget.amount)}</b> em {delTarget.bank} e o saldo da reserva será recalculado. Lembre-se: reserva é para guardar e não mexer.</p>
            <div className="flex flex-col gap-3 sm:flex-row-reverse">
              <button className="btn-primary flex-1" onClick={() => setDelTarget(null)}>Manter</button>
              <button className="btn-danger flex-1" disabled={busy} onClick={removeEntry}>{busy ? "Removendo..." : "Sim, remover"}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
