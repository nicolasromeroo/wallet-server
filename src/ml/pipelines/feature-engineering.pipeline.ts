/**
 * Feature Engineering Pipeline
 * Responsabilidad: transformar datos limpios en vectores numéricos para el modelo.
 * DATA → PREP → [este pipeline] → MODEL → PREDICTION
 */

// Longitud fija del vector de texto (padding/truncado)
export const MAX_DESCRIPTION_LENGTH = 50;

/**
 * Convierte texto en vector numérico normalizado [0, 1].
 * Cada char se representa como charCode / 255.
 * Padding con espacios si el texto es más corto.
 */
export function textToVector(text: string): number[] {
  const padded = text
    .substring(0, MAX_DESCRIPTION_LENGTH)
    .padEnd(MAX_DESCRIPTION_LENGTH, ' ');
  return padded.split('').map((c) => c.charCodeAt(0) / 255);
}

/**
 * Codifica una categoría como one-hot vector.
 * Ej: 'COMIDA' con CATEGORIES=[COMIDA,TRANSPORTE,...] → [1,0,0,0,0,0,0,0]
 */
export function categoryToOneHot(
  category: string,
  categories: string[],
): number[] {
  return categories.map((c) => (c === category ? 1 : 0));
}

/**
 * Decodifica un vector de probabilidades a la categoría con mayor score.
 */
export function oneHotToCategory(
  vector: number[],
  categories: string[],
): string {
  const maxIdx = vector.indexOf(Math.max(...vector));
  return categories[maxIdx] ?? 'OTROS';
}

/**
 * Construye el vector de features para el modelo de forecast.
 * Normaliza todas las dimensiones a [0, 1] para estabilidad del entrenamiento.
 */
export function buildForecastFeatures(
  dayOfMonth: number,
  lastWeekAverage: number,
  totalMonthSpend: number,
  monthlyIncome: number,
): number[] {
  return [
    dayOfMonth / 31,
    lastWeekAverage / 100_000,
    totalMonthSpend / 100_000,
    monthlyIncome > 0 ? monthlyIncome / 1_000_000 : 0,
  ];
}

// ─── Anomalías: features + estadística robusta ───────────────────────────────

/** Tope para normalizar el monto en escala logarítmica → ~[0, 1]. */
const LOG_MONTO_SCALE = Math.log1p(2_000_000);

/**
 * Construye el vector de features de un gasto para el autoencoder de anomalías.
 *
 * Usamos escala logarítmica del monto porque los gastos siguen una distribución
 * de cola larga (muchos chicos, pocos enormes): el log comprime esa cola y evita
 * que un solo gasto gigante domine el aprendizaje.
 *
 * Dimensiones (1 + 8 + 2 = 11):
 *   [0]      log(monto) normalizado
 *   [1..8]   one-hot de la categoría
 *   [9]      día del mes / 31      → captura patrones de fin de mes (alquiler, etc.)
 *   [10]     día de la semana / 6  → captura patrones de fin de semana
 */
export function buildAnomalyFeatures(
  monto: number,
  categoria: string,
  fecha: Date,
  categories: string[],
): number[] {
  const logMonto = Math.log1p(Math.max(0, monto)) / LOG_MONTO_SCALE;
  const dayOfMonth = fecha.getDate() / 31;
  const dayOfWeek = fecha.getDay() / 6;
  return [logMonto, ...categoryToOneHot(categoria, categories), dayOfMonth, dayOfWeek];
}

/** Mediana de un arreglo (robusta a outliers, a diferencia del promedio). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * MAD — Median Absolute Deviation: la mediana de las distancias a la mediana.
 * Es la versión "robusta" del desvío estándar: un único gasto extremo no la
 * infla, así que sirve para detectar justamente ese gasto extremo.
 */
export function medianAbsoluteDeviation(values: number[], med?: number): number {
  if (values.length === 0) return 0;
  const m = med ?? median(values);
  const deviations = values.map((v) => Math.abs(v - m));
  return median(deviations);
}

/**
 * Z-score robusto basado en mediana y MAD.
 * El factor 0.6745 hace que, para datos normales, esta escala coincida con la
 * del desvío estándar clásico (regla empírica: |z| > 3.5 ≈ outlier claro).
 */
export function robustZScore(value: number, med: number, mad: number): number {
  if (mad <= 0) return 0;
  return (0.6745 * (value - med)) / mad;
}
