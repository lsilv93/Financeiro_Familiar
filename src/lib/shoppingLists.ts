import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { HttpError } from "./session";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sem O/0/I/1/L (evita confusão)

/** Código único da lista, no formato LC-7K3F9A. */
export async function newListCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = "LC-" + Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    if (!(await prisma.shoppingList.findUnique({ where: { code }, select: { id: true } }))) return code;
  }
  throw new HttpError(500, "Não foi possível gerar o código da lista");
}

/** Lista da família do usuário (404 para qualquer outra). */
export async function familyList(id: string, familyId: string) {
  const list = await prisma.shoppingList.findFirst({ where: { id, familyId } });
  if (!list) throw new HttpError(404, "Lista não encontrada");
  return list;
}

/** Encerra a lista automaticamente quando 100% dos itens foram comprados. */
export async function closeIfComplete(listId: string): Promise<boolean> {
  const pending = await prisma.shoppingItem.count({ where: { listId, status: { not: "BOUGHT" } } });
  const total = await prisma.shoppingItem.count({ where: { listId } });
  if (total > 0 && pending === 0) {
    await prisma.shoppingList.update({ where: { id: listId }, data: { status: "CLOSED", closedAt: new Date() } });
    return true;
  }
  return false;
}
