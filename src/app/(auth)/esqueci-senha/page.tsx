"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client";
import { ErrorBox } from "@/components/ui";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ message: string }>("/api/password/forgot", { method: "POST", body: { email } });
      setMsg(r.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <h2 className="text-[18px] font-semibold text-fg">Recuperar senha</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-t3">Informe o email da sua conta. Enviaremos um link para criar uma nova senha. Contas bloqueadas por tentativas incorretas são liberadas ao redefinir a senha.</p>
      </div>
      {error && <ErrorBox message={error} />}
      {msg ? (
        <div className="well text-[13px] leading-relaxed text-lime">{msg}</div>
      ) : (
        <>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={loading}>{loading ? "Enviando..." : "Enviar link de recuperação"}</button>
        </>
      )}
      <p className="text-center text-[13px] text-t3"><Link href="/login" className="font-semibold text-lime hover:text-lime-hover">Voltar ao login</Link></p>
    </form>
  );
}
