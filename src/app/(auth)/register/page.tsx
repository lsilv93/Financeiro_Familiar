"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";

export default function RegisterPage() {
  const [f, setF] = useState({ name: "", email: "", password: "", inviteCode: "", familyName: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api("/api/register", { method: "POST", body: { ...f, inviteCode: f.inviteCode || null, familyName: f.familyName || null } });
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
      <h2 className="text-[18px] font-semibold text-white">Criar conta</h2>
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
        <label className="label" htmlFor="invite">Código de convite da família <span className="text-t4">(opcional)</span></label>
        <input id="invite" className="input uppercase" placeholder="Ex.: A1B2C3D4" value={f.inviteCode} onChange={set("inviteCode")} />
        <p className="mt-2 text-[11px] text-t3">Se alguém da sua família já usa o app, peça o código em Configurações. Sem código, criamos uma nova família para você.</p>
      </div>
      {!f.inviteCode && (
        <div>
          <label className="label" htmlFor="family">Nome da família <span className="text-t4">(opcional)</span></label>
          <input id="family" className="input" value={f.familyName} onChange={set("familyName")} />
        </div>
      )}
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Criando..." : "Criar conta"}</button>
      <p className="text-center text-sm text-t3">
        Já tem conta? <Link href="/login" className="font-semibold text-lime hover:text-lime-hover">Entrar</Link>
      </p>
    </form>
  );
}
