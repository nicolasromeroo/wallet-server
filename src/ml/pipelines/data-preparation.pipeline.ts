/**
 * Data Preparation Pipeline
 * Responsabilidad: limpiar y normalizar datos crudos antes de feature engineering.
 * DATA → [este pipeline] → FEATURES → MODEL → PREDICTION
 */

export interface RawGasto {
  descripcion: string;
  monto: number;
  fecha: Date;
  userId: string;
  categoria?: string | null;
}

/** Normaliza texto: minúsculas, trim, sin caracteres especiales */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-záéíóúüñ\s0-9]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Elimina outliers usando regla de 3 sigmas */
export function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const std = Math.sqrt(
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length,
  );
  return values.filter((v) => Math.abs(v - mean) <= 3 * std);
}

/** Normaliza un monto al rango [0, 1] dado un máximo */
export function normalizeAmount(amount: number, max: number): number {
  if (max === 0) return 0;
  return Math.min(amount / max, 1);
}

/** Filtra gastos dentro de un rango de fechas */
export function filterByDateRange(
  gastos: RawGasto[],
  startDate: Date,
  endDate: Date,
): RawGasto[] {
  return gastos.filter((g) => g.fecha >= startDate && g.fecha <= endDate);
}
