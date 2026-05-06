-- AlterTable
ALTER TABLE "Gasto" ADD COLUMN     "categoria" TEXT;

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "burnRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGastos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalSueldos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ahorroProy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "diasElapsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_userId_mes_anio_key" ON "AnalyticsSnapshot"("userId", "mes", "anio");
