-- CreateEnum
CREATE TYPE "ShoppingListStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN     "listId" TEXT;

-- CreateTable
CREATE TABLE "ShoppingList" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ShoppingListStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "familyId" TEXT NOT NULL,

    CONSTRAINT "ShoppingList_pkey" PRIMARY KEY ("id")
);


-- Itens existentes: uma lista "Lista de compras" por família que já tinha itens
INSERT INTO "ShoppingList" ("id","code","name","status","createdById","familyId","createdAt")
SELECT 'lst_' || f."familyId", 'LC-' || upper(substr(md5(f."familyId"), 1, 6)), 'Lista de compras',
       CASE WHEN EXISTS (SELECT 1 FROM "ShoppingItem" x WHERE x."familyId" = f."familyId" AND x."status" <> 'BOUGHT') THEN 'OPEN'::"ShoppingListStatus" ELSE 'CLOSED'::"ShoppingListStatus" END,
       (SELECT i."createdById" FROM "ShoppingItem" i WHERE i."familyId" = f."familyId" ORDER BY i."createdAt" LIMIT 1), f."familyId", now()
FROM (SELECT DISTINCT "familyId" FROM "ShoppingItem") f;
UPDATE "ShoppingItem" SET "listId" = 'lst_' || "familyId" WHERE "listId" IS NULL;
ALTER TABLE "ShoppingItem" ALTER COLUMN "listId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ShoppingList_code_key" ON "ShoppingList"("code");

-- CreateIndex
CREATE INDEX "ShoppingList_familyId_status_idx" ON "ShoppingList"("familyId", "status");

-- CreateIndex
CREATE INDEX "ShoppingItem_listId_idx" ON "ShoppingItem"("listId");

-- AddForeignKey
ALTER TABLE "ShoppingItem" ADD CONSTRAINT "ShoppingItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ShoppingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingList" ADD CONSTRAINT "ShoppingList_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

