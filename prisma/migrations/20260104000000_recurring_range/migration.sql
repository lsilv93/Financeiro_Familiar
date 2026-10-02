-- AlterTable
ALTER TABLE "RecurringRule" ADD COLUMN "startMonth" TEXT,
ADD COLUMN "endMonth" TEXT;

-- Regras já existentes: começam no primeiro mês em que geraram lançamento (ou no mês de criação)
UPDATE "RecurringRule" r
SET "startMonth" = COALESCE(
  (SELECT MIN(t."recurringMonth") FROM "Transaction" t WHERE t."ruleId" = r."id"),
  to_char(r."createdAt", 'YYYY-MM')
);

ALTER TABLE "RecurringRule" ALTER COLUMN "startMonth" SET NOT NULL;
