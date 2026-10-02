"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError("As senhas não conferem");
    setLoading(true);
    try {
      await api("/api/password/reset", { method: "POST", body: { token, password } });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao redefinir");
    } finally {
      setLoading(false);
    }
  }

  if (done)
    return (
      <div className="space-y-5">
        <h2 className="text-[18px] font-semibold text-fg">Senha redefinida</h2>
        <div className="well text-[13px] text-lime">Pronto! Sua conta está liberada. Entre com a nova senha.</div>
        <Link href="/login" className="btn-primary w-full">Ir para o login</Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-5">
      <h2 className="text-[18px] font-semibold text-fg">Nova senha</h2>
      {!token && <ErrorBox message="Link inválido. Solicite um novo link de recuperação." />}
      {error && <ErrorBox message={error} />}
      <div>
        <label className="label" htmlFor="p1">Nova senha (mín. 8 caracteres)</label>
        <input id="p1" type="password" required minLength={8} autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p2">Confirmar senha</label>
        <input id="p2" type="password" required minLength={8} autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <button className="btn-primary w-full" disabled={loading || !token}>{loading ? "Salvando..." : "Salvar nova senha"}</button>
      <p className="text-center text-[13px] text-t3"><Link href="/esqueci-senha" className="font-semibold text-lime hover:text-lime-hover">Solicitar novo link</Link></p>
    </form>
  );
}

export default function RedefinirSenhaPage() {
  return <Suspense fallback={null}><ResetForm /></Suspense>;
}
