import { prisma } from "./prisma";
import { MAX_FAMILY_MEMBERS } from "./security";
import { HttpError } from "./session";

/** Usuário principal da família (quem criou). Cai no membro mais antigo se não houver registro. */
export async function familyOwnerId(familyId: string): Promise<string | null> {
  const f = await prisma.family.findUnique({ where: { id: familyId }, select: { ownerId: true } });
  if (f?.ownerId) return f.ownerId;
  const first = await prisma.user.findFirst({ where: { familyId }, orderBy: { createdAt: "asc" }, select: { id: true } });
  return first?.id ?? null;
}

export async function notify(userId: string, n: { type: string; title: string; body: string; requestId?: string }) {
  await prisma.notification.create({ data: { userId, type: n.type, title: n.title, body: n.body, requestId: n.requestId ?? null } });
}

/** Cria um pedido de entrada pendente e avisa o usuário principal da família de destino. */
export async function createJoinRequest(user: { id: string; name: string }, targetFamily: { id: string; name: string }) {
  await prisma.joinRequest.updateMany({ where: { userId: user.id, status: "PENDING" }, data: { status: "REJECTED", decidedAt: new Date() } }); // só um pedido por vez
  const req = await prisma.joinRequest.create({ data: { userId: user.id, familyId: targetFamily.id } });
  const owner = await familyOwnerId(targetFamily.id);
  if (owner) await notify(owner, { type: "JOIN_REQUEST", title: "Novo pedido de acesso", body: `${user.name} pediu para entrar na família ${targetFamily.name}.`, requestId: req.id });
  return req;
}

/** Aprova: move os dados do solicitante (que estava sozinho na própria família) para a família de destino. */
export async function approveJoin(requestId: string, decidedById: string) {
  const req = await prisma.joinRequest.findUnique({ where: { id: requestId }, include: { user: true, family: { include: { _count: { select: { members: true } } } } } });
  if (!req || req.status !== "PENDING") throw new HttpError(404, "Pedido não encontrado ou já respondido");
  if (req.family._count.members >= MAX_FAMILY_MEMBERS) throw new HttpError(400, "A família atingiu o limite de membros.");
  const old = req.user.familyId;
  const others = await prisma.user.count({ where: { familyId: old, id: { not: req.userId } } });
  if (others > 0) throw new HttpError(400, "O solicitante já faz parte de uma família com outros membros.");
  const where = { userId: req.userId, familyId: old };
  const data = { familyId: req.familyId };
  await prisma.$transaction([
    prisma.transaction.updateMany({ where, data }),
    prisma.installmentPlan.updateMany({ where, data }),
    prisma.recurringRule.updateMany({ where, data }),
    prisma.creditCard.updateMany({ where, data }),
    prisma.savingsEntry.updateMany({ where, data }),
    prisma.user.update({ where: { id: req.userId }, data: { familyId: req.familyId, awaitingApproval: false } }),
    prisma.joinRequest.update({ where: { id: req.id }, data: { status: "APPROVED", decidedAt: new Date(), decidedById } }),
  ]);
  if (old !== req.familyId) await prisma.family.deleteMany({ where: { id: old, members: { none: {} } } });
  await notify(req.userId, { type: "JOIN_APPROVED", title: "Acesso aprovado", body: `Você agora faz parte da família ${req.family.name}.` });
  return req;
}

export async function rejectJoin(requestId: string, decidedById: string) {
  const req = await prisma.joinRequest.findUnique({ where: { id: requestId }, include: { family: true } });
  if (!req || req.status !== "PENDING") throw new HttpError(404, "Pedido não encontrado ou já respondido");
  await prisma.$transaction([
    prisma.joinRequest.update({ where: { id: req.id }, data: { status: "REJECTED", decidedAt: new Date(), decidedById } }),
    prisma.user.update({ where: { id: req.userId }, data: { awaitingApproval: false } }), // volta a usar a própria família
  ]);
  await notify(req.userId, { type: "JOIN_REJECTED", title: "Pedido recusado", body: `O pedido para entrar na família ${req.family.name} foi recusado.` });
  return req;
}
