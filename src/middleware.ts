import { NextResponse, type NextRequest } from "next/server";

export const config = { matcher: ["/api/:path*"] };

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);
const MAX_BODY = 256 * 1024; // 256 KB: nenhuma rota legítima precisa de mais

const deny = (status: number, error: string) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Barreira para a API (exceto /api/auth, que o NextAuth protege com token CSRF próprio):
 *  - bloqueia requisições de outras origens (CSRF) em métodos que alteram dados;
 *  - limita o tamanho do corpo e exige JSON.
 */
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (SAFE.has(req.method) || pathname.startsWith("/api/auth/")) return NextResponse.next();

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = req.headers.get("origin");
  if (origin) {
    let originHost = "";
    try { originHost = new URL(origin).host; } catch { /* inválida */ }
    if (!host || originHost !== host) return deny(403, "Origem não permitida");
  } else {
    const site = req.headers.get("sec-fetch-site");
    if (site && site !== "same-origin" && site !== "none") return deny(403, "Origem não permitida");
  }

  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return deny(413, "Corpo da requisição muito grande");
  if (len > 0 && !(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return deny(415, "Use application/json");

  return NextResponse.next();
}
