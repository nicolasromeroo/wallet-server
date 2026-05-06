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
