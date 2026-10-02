"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { ErrorBox } from "@/components/ui";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError(
        res.error === "RATE"
          ? "Muitas tentativas deste dispositivo. Aguarde alguns minutos e tente novamente."
          : res.error === "LOCKED"
          ? "Conta bloqueada após 3 tentativas incorretas. Use “Esqueci minha senha” para receber um link de recuperação por email."
          : "Email ou senha incorretos. Após 3 tentativas a conta é bloqueada.",
      );
      setLoading(false);
    } else {
      window.location.href = "/painel";
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="text-[18px] font-semibold text-fg">Entrar</h2>
      {error && <ErrorBox message={error} />}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="text-right"><Link href="/esqueci-senha" className="text-[12px] font-semibold text-lime hover:text-lime-hover">Esqueci minha senha</Link></div>
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      <p className="text-center text-sm text-t3">
        Não tem conta? <Link href="/register" className="font-semibold text-lime hover:text-lime-hover">Cadastre-se</Link>
      </p>
    </form>
  );
}
