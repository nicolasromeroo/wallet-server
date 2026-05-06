// ─── Categorías de gastos para clasificación ─────────────────────────────────
export type ExpenseCategory =
  | 'COMIDA'
  | 'TRANSPORTE'
  | 'ENTRETENIMIENTO'
  | 'SALUD'
  | 'EDUCACION'
  | 'HOGAR'
  | 'TECNOLOGIA'
  | 'OTROS';

export const CATEGORIES: ExpenseCategory[] = [
  'COMIDA',
  'TRANSPORTE',
  'ENTRETENIMIENTO',
  'SALUD',
  'EDUCACION',
  'HOGAR',
  'TECNOLOGIA',
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
