"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { api } from "@/lib/client";
import { ROLE_LABELS, type RoleKey } from "@/lib/roles";
import { ErrorBox } from "@/components/ui";

function RegisterForm() {
  const sp = useSearchParams();
  const [mode, setMode] = useState<"create" | "join">(sp.get("modo") === "entrar" || sp.get("codigo") ? "join" : "create");
  const [f, setF] = useState({ name: "", email: "", password: "", inviteCode: (sp.get("codigo") ?? "").toUpperCase(), familyName: "" });
  const [role, setRole] = useState<RoleKey | "">("");
  const [familyFound, setFamilyFound] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: k === "inviteCode" ? e.target.value.toUpperCase() : e.target.value });

  // Mostra o nome da família quando o código é válido.
  useEffect(() => {
    setFamilyFound(null);
    if (mode !== "join" || f.inviteCode.length < 4) return;
    const t = setTimeout(() => {
      api<{ valid: boolean; familyName?: string }>(`/api/invite/${encodeURIComponent(f.inviteCode)}`).then((r) => setFamilyFound(r.valid ? r.familyName ?? "" : null)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [mode, f.inviteCode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!role) return setError("Escolha se você é marido, mulher ou filho(a)");
    if (mode === "join" && !f.inviteCode) return setError("Informe o código da família");
    setLoading(true);
    try {
      await api("/api/register", {
        method: "POST",
        body: { name: f.name, email: f.email, password: f.password, role, inviteCode: mode === "join" ? f.inviteCode : null, familyName: mode === "create" ? f.familyName || null : null },
      });
      const res = await signIn("credentials", { email: f.email, password: f.password, redirect: false });
      if (res?.error) throw new Error("Conta criada, mas não foi possível entrar. Tente fazer login.");
      window.location.href = "/painel";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="text-[18px] font-semibold text-fg">Criar conta</h2>
      {error && <ErrorBox message={error} />}
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" required autoComplete="name" className="input" value={f.name} onChange={set("name")} />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" className="input" value={f.email} onChange={set("email")} />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha (mín. 8 caracteres)</label>
        <input id="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={f.password} onChange={set("password")} />
      </div>

      <div>
        <span className="label">Quem é você na família?</span>
        <div className="seg w-full" role="radiogroup" aria-label="Papel na família">
          {(Object.keys(ROLE_LABELS) as RoleKey[]).map((r) => (
            <button type="button" key={r} role="radio" aria-checked={role === r} className={`seg-btn ${role === r ? "on" : ""}`} onClick={() => setRole(r)}>{ROLE_LABELS[r]}</button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Família</span>
        <div className="seg w-full" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "create"} className="seg-btn" onClick={() => setMode("create")}>Criar uma família</button>
          <button type="button" role="tab" aria-selected={mode === "join"} className="seg-btn" onClick={() => setMode("join")}>Tenho um código</button>
        </div>
      </div>

      {mode === "create" ? (
        <div>
          <label className="label" htmlFor="family">Nome da família <span className="normal-case tracking-normal text-t4">(opcional)</span></label>
          <input id="family" className="input" placeholder="Ex.: Família Silva" value={f.familyName} onChange={set("familyName")} />
          <p className="mt-2 text-[11px] text-t4">Depois você poderá convidar os outros membros pelo WhatsApp.</p>
        </div>
      ) : (
        <div>
          <label className="label" htmlFor="invite">Código da família</label>
          <input id="invite" className="input mono uppercase" placeholder="Ex.: A1B2C3D4" value={f.inviteCode} onChange={set("inviteCode")} />
          {familyFound !== null && <p className="mt-2 text-[12px] font-semibold text-lime">Família encontrada: {familyFound}</p>}
          {familyFound === null && f.inviteCode.length >= 8 && <p className="mt-2 text-[11px] text-t4">Verificando o código...</p>}
        </div>
      )}

      <button className="btn-primary w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</button>
      <p className="text-center text-[13px] text-t3">
        Já tem conta? <Link href="/login" className="font-semibold text-lime hover:text-lime-hover">Entrar</Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
