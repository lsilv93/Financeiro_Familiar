"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ErrorBox } from "@/components/ui";

function LoginForm() {
  const fromRegister = useSearchParams().get("cadastro") === "ok";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Vindo do cadastro: mostra a confirmação, preenche o email e leva o foco para a senha.
  useEffect(() => {
    if (!fromRegister) return;
    let saved: string | null = null;
    try { saved = sessionStorage.getItem("ff_novo_email"); sessionStorage.removeItem("ff_novo_email"); } catch { /* armazenamento indisponível */ }
    if (saved) {
      setEmail(saved);
      passwordRef.current?.focus();
    }
  }, [fromRegister]);

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
      {fromRegister && !error && <div className="well mb-4 text-[13px] text-lime" role="status" style={{ background: "var(--lime-well)" }}>✅ Conta criada com sucesso! Entre com seu email e senha para acessar.</div>}
      {error && <ErrorBox message={error} />}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input ref={passwordRef} id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="text-right"><Link href="/esqueci-senha" className="text-[12px] font-semibold text-lime hover:text-lime-hover">Esqueci minha senha</Link></div>
      <button className="btn-primary w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      <p className="text-center text-sm text-t3">
        Não tem conta? <Link href="/register" className="font-semibold text-lime hover:text-lime-hover">Cadastre-se</Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
