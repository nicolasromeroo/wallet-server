-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "mes" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "burnRate" REAL NOT NULL DEFAULT 0,
    "totalGastos" REAL NOT NULL DEFAULT 0,
    "totalSueldos" REAL NOT NULL DEFAULT 0,
    "ahorroProy" REAL NOT NULL DEFAULT 0,
    "diasElapsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_userId_mes_anio_key" ON "AnalyticsSnapshot"("userId", "mes", "anio");
