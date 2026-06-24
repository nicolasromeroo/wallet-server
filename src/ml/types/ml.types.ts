// ─── Categorías de gastos para clasificación ─────────────────────────────────
// IMPORTANTE: estas keys deben coincidir EXACTAMENTE con la fuente única del
// frontend (front-exp/src/lib/categories.ts).
export type ExpenseCategory =
  | 'COMIDA'
  | 'ALMACEN'
  | 'UBER'
  | 'COLECTIVO'
  | 'ENTRETENIMIENTO'
  | 'SUSCRIPCIONES'
  | 'SALUD'
  | 'MASCOTAS'
  | 'EDUCACION'
  | 'HOGAR'
  | 'SERVICIOS'
  | 'TECNOLOGIA'
  | 'ROPA'
  | 'OTROS';

export const CATEGORIES: ExpenseCategory[] = [
  'COMIDA',
  'ALMACEN',
  'UBER',
  'COLECTIVO',
  'ENTRETENIMIENTO',
  'SUSCRIPCIONES',
  'SALUD',
  'MASCOTAS',
  'EDUCACION',
  'HOGAR',
  'SERVICIOS',
  'TECNOLOGIA',
  'ROPA',
  'OTROS',
];

// ─── Estructuras de datos ML ──────────────────────────────────────────────────
export interface TrainingExample {
  description: string;
  monto: number;
  categoria: ExpenseCategory;
}

export interface PredictionResult {
  categoria: ExpenseCategory;
  confidence: number;
  allProbabilities: Record<ExpenseCategory, number>;
  source: 'model' | 'rules'; // indica si fue el modelo o el fallback
}

export interface ForecastResult {
  predictedExpense: number;
  dailyBurnRate: number;
  confidence: number;
}

export interface ModelMetrics {
  accuracy: number;
  loss: number;
  trainedAt: Date;
  samplesUsed: number;
}

// ─── Detección de anomalías (gastos inusuales) ───────────────────────────────

/** Nivel cualitativo de la anomalía, derivado del score. */
export type AnomalyLevel = 'normal' | 'inusual' | 'muy_inusual';

/**
 * Qué tipo de detector marcó el gasto:
 *  - monto:      estadística por categoría (monto atípico)
 *  - patron:     autoencoder (combinación monto+categoría+fecha inusual)
 *  - frecuencia: misma compra repetida muchas veces en poco tiempo
 */
export type AnomalyKind = 'monto' | 'patron' | 'frecuencia';

/** Rango esperado de gasto para una categoría, usado para explicar el resultado. */
export interface ExpectedRange {
  typical: number; // gasto "normal" (mediana) de la categoría
  min: number;
  max: number;
  count: number; // cuántos gastos respaldan la estadística
}

/** Resultado de evaluar un gasto puntual contra el patrón histórico del usuario. */
export interface AnomalyResult {
  gastoId: string;
  descripcion: string;
  monto: number;
  categoria: string;
  fecha: string;
  score: number; // 0..1 — qué tan atípico es (1 = extremo)
  level: AnomalyLevel;
  kind: AnomalyKind; // qué detector lo marcó
  isAnomaly: boolean;
  reason: string; // explicación en lenguaje natural
  expected: ExpectedRange;
  occurrences?: number; // solo para kind 'frecuencia': cuántas veces en 7 días
  source: 'model' | 'stats'; // autoencoder o estadística robusta
}

/** Resultado completo de un escaneo de anomalías sobre los gastos recientes. */
export interface AnomalyScanResult {
  anomalies: AnomalyResult[];
  scanned: number; // cuántos gastos se analizaron
  windowDays: number; // ventana temporal analizada
  source: 'model' | 'stats';
  /** Línea base por categoría (para que el frontend explique el "normal"). */
  baseline: Record<string, ExpectedRange>;
  message?: string; // p.ej. "datos insuficientes"
}
