import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BurnRateMetrics,
  SavingsMetrics,
  CategoryBreakdown,
  MonthlyComparison,
  AnalyticsSnapshotResult,
} from './types/analytics.types';

/**
 * Analytics Service — métricas avanzadas sobre gastos e ingresos.
 *
 * Métricas implementadas:
 *   1. Burn Rate             → cuánto "quemás" por día
 *   2. Ahorro proyectado     → ingreso − gasto proyectado del mes
 *   3. % gasto por categoría → breakdown para dashboards y ML features
 *   4. Comparación mensual   → lógica de insights inteligentes
 *   5. Snapshot completo     → persiste en AnalyticsSnapshot para historial
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  private get prisma() {
    return this.prismaService;
  }

  // ─── 1. Burn Rate ─────────────────────────────────────────────────────────
  async getBurnRate(
    userId: string,
    mes?: number,
    anio?: number,
  ): Promise<BurnRateMetrics> {
    const now = new Date();
    const targetMes = mes ?? now.getMonth() + 1;
    const targetAnio = anio ?? now.getFullYear();

    const start = new Date(targetAnio, targetMes - 1, 1);
    const diasEnMes = new Date(targetAnio, targetMes, 0).getDate();

    const esActual =
      targetMes === now.getMonth() + 1 && targetAnio === now.getFullYear();
    const end = esActual ? now : new Date(targetAnio, targetMes, 0, 23, 59, 59);
    const diasElapsed = esActual ? now.getDate() : diasEnMes;

    const result = await this.prisma.gasto.aggregate({
      _sum: { monto: true },
      where: { userId, fecha: { gte: start, lte: end } },
    });

    const totalGastos = result._sum.monto ?? 0;

    // Suavizado: si llevamos menos de 7 días en el mes, usar ventana deslizante
    // de los últimos 7 días para evitar proyecciones distorsionadas al inicio del mes.
    let burnRate: number;
    const directRate = diasElapsed > 0 ? totalGastos / diasElapsed : 0;

    if (esActual && diasElapsed < 7) {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentResult = await this.prisma.gasto.aggregate({
        _sum: { monto: true },
        where: { userId, fecha: { gte: sevenDaysAgo, lte: now } },
      });
      const slidingRate = (recentResult._sum.monto ?? 0) / 7;
      // Blend: cuantos más días transcurridos, más peso al rate directo
      const peso = diasElapsed / 7;
      burnRate = peso * directRate + (1 - peso) * slidingRate;
      if (burnRate === 0) burnRate = directRate;
    } else {
      burnRate = directRate;
    }

    return {
      totalGastos,
      diasElapsed,
      burnRate,
      burnRateProyectado: burnRate * diasEnMes,
    };
  }

  // ─── 2. Ahorro proyectado ─────────────────────────────────────────────────
  async getProjectedSavings(
    userId: string,
    burnRateOptional?: BurnRateMetrics,
  ): Promise<SavingsMetrics> {
    const now = new Date();
    const diasEnMes = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();

    // Queries secuenciales para no agotar pool de conexiones
    const ultimoSueldo = await this.prisma.sueldo.findFirst({
      where: { userId },
      orderBy: { fecha: 'desc' },
    });
    const burnRate = burnRateOptional ?? (await this.getBurnRate(userId));

    const income = ultimoSueldo?.monto ?? 0;
    const projectedExpenses = burnRate.burnRate * diasEnMes;
    const projectedSavings = income - projectedExpenses;

    return {
      income,
      projectedExpenses,
      projectedSavings,
      savingsRate: income > 0 ? (projectedSavings / income) * 100 : 0,
    };
  }

  // ─── 3. % Gasto por categoría ─────────────────────────────────────────────
  async getCategoryBreakdown(
    userId: string,
    mes?: number,
    anio?: number,
  ): Promise<CategoryBreakdown[]> {
    const now = new Date();
    const targetMes = mes ?? now.getMonth() + 1;
    const targetAnio = anio ?? now.getFullYear();

    const start = new Date(targetAnio, targetMes - 1, 1);
    const end = new Date(targetAnio, targetMes, 0, 23, 59, 59);

    const gastos = await this.prisma.gasto.findMany({
      where: { userId, fecha: { gte: start, lte: end } },
    });

    const total = gastos.reduce((a, b) => a + b.monto, 0);

    const byCategory = gastos.reduce(
      (acc, g) => {
        const cat = g.categoria ?? 'OTROS';
        if (!acc[cat]) acc[cat] = { total: 0, count: 0 };
        acc[cat].total += g.monto;
        acc[cat].count += 1;
        return acc;
      },
      {} as Record<string, { total: number; count: number }>,
    );

    return Object.entries(byCategory)
      .map(([categoria, data]) => ({
        categoria,
        total: data.total,
        percentage: total > 0 ? (data.total / total) * 100 : 0,
        count: data.count,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ─── 4. Comparación mensual ───────────────────────────────────────────────
  async getMonthlyComparison(userId: string): Promise<MonthlyComparison> {
    const now = new Date();
    const currentMes = now.getMonth() + 1;
    const currentAnio = now.getFullYear();
    const prevMes = currentMes === 1 ? 12 : currentMes - 1;
    const prevAnio = currentMes === 1 ? currentAnio - 1 : currentAnio;

    // Queries secuenciales para no agotar pool de conexiones
    const currentBurn = await this.getBurnRate(userId, currentMes, currentAnio);
    const lastBurn = await this.getBurnRate(userId, prevMes, prevAnio);

    const currentMonthProjected = currentBurn.burnRateProyectado;
    const lastMonthTotal = lastBurn.totalGastos;
    const percentageChange =
      lastMonthTotal > 0
        ? ((currentMonthProjected - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

    // Lógica inteligente de insights (sin ML — reglas + comparación)
    let insight = 'Sin cambios significativos respecto al mes anterior.';
    if (currentMonthProjected > lastMonthTotal * 1.3) {
      insight = `⚠️ Gastás ${percentageChange.toFixed(0)}% más que el mes pasado. Revisá tus gastos variables.`;
    } else if (currentMonthProjected > lastMonthTotal * 1.1) {
      insight = `📈 Tus gastos subieron un ${percentageChange.toFixed(0)}% respecto al mes anterior.`;
    } else if (currentMonthProjected < lastMonthTotal * 0.9) {
      insight = `✅ ¡Bajaste tus gastos un ${Math.abs(percentageChange).toFixed(0)}%! Vas muy bien.`;
    }

    return { currentMonthProjected, lastMonthTotal, percentageChange, insight };
  }

  // ─── 5. Snapshot completo + persistencia ─────────────────────────────────
  async getFullSnapshot(userId: string): Promise<AnalyticsSnapshotResult> {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    try {
      // Ejecutar secuencialmente para no agotar pool de conexiones en producción
      const burnRate = await this.getBurnRate(userId);
      const savings = await this.getProjectedSavings(userId, burnRate);
      const categories = await this.getCategoryBreakdown(userId);
      const comparison = await this.getMonthlyComparison(userId);

      console.log('[ANALYTICS] Snapshot data:', {
        burnRate,
        savings,
        categories,
        comparison,
      });

      // Persistir snapshot para historial y ML features futuras
      await this.prisma.analyticsSnapshot.upsert({
        where: { userId_mes_anio: { userId, mes, anio } },
        create: {
          userId,
          mes,
          anio,
          burnRate: burnRate.burnRate,
          totalGastos: burnRate.totalGastos,
          totalSueldos: savings.income,
          ahorroProy: savings.projectedSavings,
          diasElapsed: burnRate.diasElapsed,
        },
        update: {
          burnRate: burnRate.burnRate,
          totalGastos: burnRate.totalGastos,
          totalSueldos: savings.income,
          ahorroProy: savings.projectedSavings,
          diasElapsed: burnRate.diasElapsed,
        },
      });

      return {
        userId,
        mes,
        anio,
        burnRate,
        savings,
        categories,
        comparison,
        generatedAt: now,
      };
    } catch (error) {
      console.error('[ANALYTICS] Error en getFullSnapshot:', error);
      throw error;
    }
  }

  // ─── Importación CSV ──────────────────────────────────────────────────────
  async importFromCSV(
    rows: Array<{ descripcion: string; monto: string; fecha: string }>,
    userId: string,
  ) {
    const gastos = rows
      .filter((r) => r.descripcion && r.monto && !isNaN(parseFloat(r.monto)))
      .map((r) => ({
        descripcion: r.descripcion.trim(),
        monto: parseFloat(r.monto),
        fecha: r.fecha ? new Date(r.fecha) : new Date(),
        userId,
      }));

    const result = await this.prisma.gasto.createMany({ data: gastos });
    return { imported: result.count, skipped: rows.length - result.count };
  }

  // ─── Bank sync mock ───────────────────────────────────────────────────────
  async getBankSyncMock(userId: string) {
    const mockTransactions = [
      {
        descripcion: 'Supermercado Jumbo',
        monto: 8500,
        fecha: new Date(),
        categoria: 'COMIDA',
      },
      {
        descripcion: 'Uber',
        monto: 1200,
        fecha: new Date(),
        categoria: 'TRANSPORTE',
      },
      {
        descripcion: 'Netflix',
        monto: 2990,
        fecha: new Date(),
        categoria: 'ENTRETENIMIENTO',
      },
      {
        descripcion: 'Farmacia del Pueblo',
        monto: 3200,
        fecha: new Date(),
        categoria: 'SALUD',
      },
      {
        descripcion: 'YPF Combustible',
        monto: 15000,
        fecha: new Date(),
        categoria: 'TRANSPORTE',
      },
    ];

    const result = await this.prisma.gasto.createMany({
      data: mockTransactions.map((t) => ({ ...t, userId })),
    });

    return {
      synced: result.count,
      transactions: mockTransactions,
      message:
        'Mock bank sync completo. Los eventos de gasto serán procesados.',
    };
  }
}
