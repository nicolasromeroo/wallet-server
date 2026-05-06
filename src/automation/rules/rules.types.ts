// ─── Tipo de acción que una regla puede disparar ──────────────────────────────
export interface RuleAction {
  type: 'NOTIFICATION' | 'ALERT' | 'SUGGESTION';
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  metadata?: Record<string, unknown>;
}

// ─── Contexto que recibe el motor de reglas ───────────────────────────────────
// Contiene todos los valores pre-calculados necesarios para evaluar las condiciones.
export interface RuleContext {
  userId: string;
  // Gastos por categoría del mes actual
  comida: number;
  transporte: number;
  entretenimiento: number;
  salud: number;
  educacion: number;
  hogar: number;
  tecnologia: number;
  otros: number;
  // Totales
  totalGastos: number;
  income: number;
  burnRate: number; // $ por día
  // Último gasto registrado (para reglas puntuales)
  lastGastoMonto: number;
  lastGastoDescripcion: string;
  mes: number;
  anio: number;
}

// ─── Definición de una regla ──────────────────────────────────────────────────
export interface Rule {
  id: string;
  name: string;
  description: string;
  condition: (ctx: RuleContext) => boolean;
  action: (ctx: RuleContext) => RuleAction;
}

// ─── Resultado de ejecutar una regla ─────────────────────────────────────────
export interface RuleExecutionResult {
  triggered: boolean;
  ruleId: string;
  ruleName: string;
  action: RuleAction | null;
}
