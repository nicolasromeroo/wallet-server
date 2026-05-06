/*
  Warnings:

  - A unique constraint covering the columns `[noteId]` on the table `Gasto` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "noteId" INTEGER;

-- CreateTable
CREATE TABLE "Note" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sueldoId" TEXT,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gasto_noteId_key" ON "Gasto"("noteId");

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_sueldoId_fkey" FOREIGN KEY ("sueldoId") REFERENCES "Sueldo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
