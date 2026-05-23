// ─── Métricas de Burn Rate ────────────────────────────────────────────────────
export interface BurnRateMetrics {
  totalGastos: number;
  diasElapsed: number;
  burnRate: number; // $ por día
  burnRateProyectado: number; // burnRate × días del mes = gasto mensual proyectado
}

// ─── Ahorro proyectado ────────────────────────────────────────────────────────
export interface SavingsMetrics {
  income: number;
  projectedExpenses: number;
  projectedSavings: number;
  savingsRate: number; // porcentaje sobre el ingreso (puede ser negativo)
  saldoActual: number; // income - totalGastos (dinero disponible HOY, nunca proyectado)
}

// ─── Breakdown por categoría ──────────────────────────────────────────────────
export interface CategoryBreakdown {
  categoria: string;
  total: number;
  percentage: number;
  count: number;
}

// ─── Comparación intermensual ─────────────────────────────────────────────────
export interface MonthlyComparison {
  currentMonthProjected: number;
  lastMonthTotal: number;
  percentageChange: number;
  insight: string; // texto legible para el usuario
}

// ─── Snapshot completo de analytics ──────────────────────────────────────────
export interface AnalyticsSnapshotResult {
  userId: string;
  mes: number;
  anio: number;
  burnRate: BurnRateMetrics;
  savings: SavingsMetrics;
  categories: CategoryBreakdown[];
  comparison: MonthlyComparison;
  generatedAt: Date;
}
