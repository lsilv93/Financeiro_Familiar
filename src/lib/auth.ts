import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare, hashSync } from "bcryptjs";

export const MAX_LOGIN_FAILURES = 3;
let dummy: string | undefined;
const DUMMY_HASH = () => (dummy ??= hashSync("dummy-password", 12));
import { prisma } from "./prisma";
import { blockedMinutes, registerFailure, sha } from "./security";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email e senha",
      credentials: { email: { label: "Email", type: "email" }, password: { label: "Senha", type: "password" } },
      async authorize(credentials, req) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!email || !password) return null;
        // Limite por IP (credential stuffing): 20 falhas em 15 min bloqueiam o IP por 15 min.
        const ipKey = `login:ip:${sha(String((req?.headers as Record<string, unknown> | undefined)?.["x-forwarded-for"] ?? "unknown").split(",")[0].trim())}`;
        if ((await blockedMinutes([ipKey])) > 0) throw new Error("RATE");
        const fail = async (code: string) => {
          await registerFailure([ipKey], 20, 15);
          throw new Error(code);
        };
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          await compare(password, DUMMY_HASH()); // custo de tempo parecido, evita revelar se o email existe
          return fail("INVALID");
        }
        // Conta bloqueada: só a redefinição de senha por e-mail desbloqueia.
        if (user.lockedAt) return fail("LOCKED");
        const ok = await compare(password, user.passwordHash);
        if (!ok) {
          const u = await prisma.user.update({ where: { id: user.id }, data: { failedLogins: { increment: 1 } }, select: { failedLogins: true } });
          if (u.failedLogins >= MAX_LOGIN_FAILURES) {
            await prisma.user.update({ where: { id: user.id }, data: { lockedAt: new Date() } });
            return fail("LOCKED");
          }
          return fail("INVALID");
        }
        if (user.failedLogins > 0) await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0 } });
        return { id: user.id, name: user.name, email: user.email, pwd: user.passwordChangedAt?.getTime() ?? 0 };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id;
        token.pwd = (user as { pwd?: number }).pwd ?? 0;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid as string;
        session.user.pwd = (token.pwd as number) ?? 0;
      }
      return session;
    },
  },
};
