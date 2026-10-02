-- CreateEnum
CREATE TYPE "FamilyRole" AS ENUM ('HUSBAND', 'WIFE', 'CHILD');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "role" "FamilyRole";
