import { Injectable } from '@nestjs/common';
import { Rule, RuleContext, RuleExecutionResult } from './rules.types';

/**
 * Rules Engine — motor de reglas de negocio para automatización financiera.
 *
 * Cada regla tiene:
 *   - condition: función pura que evalúa el contexto
 *   - action: genera el mensaje/alerta si se cumple la condición
 *
 * El motor es stateless: recibe un contexto, evalúa todas las reglas y retorna resultados.
 * Para agregar nuevas reglas: simplemente push a this.rules en el constructor.
 */
@Injectable()
export class RulesEngine {
  private readonly rules: Rule[] = [
    // ── Regla 1: Gasto excesivo en comida ──────────────────────────────────
    {
      id: 'FOOD_OVERSPEND',
      name: 'Gasto excesivo en comida',
      description:
        'Se dispara cuando el gasto en comida supera el 20% del ingreso',
      condition: (ctx) => ctx.income > 0 && ctx.comida > ctx.income * 0.2,
      action: (ctx) => ({
        type: 'ALERT',
        severity: 'WARNING',
        message: `Gastás mucho en comida: $${ctx.comida.toFixed(0)} (${((ctx.comida / ctx.income) * 100).toFixed(1)}% de tu ingreso mensual).`,
        metadata: { categoria: 'COMIDA', monto: ctx.comida },
      }),
    },

    // ── Regla 2: Burn rate proyectado supera el ingreso ────────────────────
    {
      id: 'HIGH_BURN_RATE',
      name: 'Burn rate alto',
      description:
        'Se dispara cuando el gasto proyectado del mes supera el ingreso',
      condition: (ctx) => ctx.income > 0 && ctx.burnRate * 30 > ctx.income,
      action: (ctx) => ({
        type: 'ALERT',
        severity: 'CRITICAL',
        message: `A este ritmo ($${ctx.burnRate.toFixed(0)}/día) gastarás $${(ctx.burnRate * 30).toFixed(0)} este mes — superás tu ingreso de $${ctx.income.toFixed(0)}.`,
        metadata: { burnRate: ctx.burnRate, proyectado: ctx.burnRate * 30 },
      }),
    },

    // ── Regla 3: Gasto puntual alto ────────────────────────────────────────
    {
      id: 'LARGE_SINGLE_EXPENSE',
      name: 'Gasto puntual elevado',
      description:
        'Se dispara cuando un gasto individual supera el 10% del ingreso',
      condition: (ctx) =>
        ctx.income > 0 &&
        ctx.lastGastoMonto > 0 &&
        ctx.lastGastoMonto > ctx.income * 0.1,
      action: (ctx) => ({
        type: 'NOTIFICATION',
        severity: 'WARNING',
        message: `Gasto importante: "${ctx.lastGastoDescripcion}" por $${ctx.lastGastoMonto.toFixed(0)} (${((ctx.lastGastoMonto / ctx.income) * 100).toFixed(1)}% de tu ingreso).`,
        metadata: {
          descripcion: ctx.lastGastoDescripcion,
          monto: ctx.lastGastoMonto,
        },
      }),
    },

    // ── Regla 4: Ahorro proyectado negativo ────────────────────────────────
    {
      id: 'SAVINGS_NEGATIVE',
      name: 'Ahorro proyectado negativo',
      description: 'Se dispara cuando el ahorro proyectado del mes es negativo',
      condition: (ctx) => ctx.income > 0 && ctx.income - ctx.burnRate * 30 < 0,
      action: (ctx) => ({
        type: 'ALERT',
        severity: 'CRITICAL',
        message: `Proyección: este mes gastarás más de lo que ganás. Déficit estimado: $${Math.abs(ctx.income - ctx.burnRate * 30).toFixed(0)}.`,
        metadata: { deficit: ctx.income - ctx.burnRate * 30 },
      }),
    },

    // ── Regla 5: Entretenimiento elevado ──────────────────────────────────
    {
      id: 'ENTERTAINMENT_HIGH',
      name: 'Entretenimiento elevado',
      description:
        'Se dispara cuando entretenimiento supera el 15% del ingreso',
      condition: (ctx) =>
        ctx.income > 0 && ctx.entretenimiento > ctx.income * 0.15,
      action: (ctx) => ({
        type: 'SUGGESTION',
        severity: 'INFO',
        message: `Entretenimiento: $${ctx.entretenimiento.toFixed(0)} este mes. Considerá revisar tus suscripciones.`,
        metadata: { monto: ctx.entretenimiento },
      }),
    },

    // ── Regla 6: Sin ahorro proyectado ────────────────────────────────────
    {
      id: 'LOW_SAVINGS_RATE',
      name: 'Tasa de ahorro baja',
      description:
        'Se dispara cuando el ahorro proyectado es menor al 10% del ingreso',
      condition: (ctx) => {
        if (ctx.income <= 0) return false;
        const projectedSavings = ctx.income - ctx.burnRate * 30;
        return projectedSavings < ctx.income * 0.1 && projectedSavings >= 0;
      },
      action: (ctx) => ({
        type: 'SUGGESTION',
        severity: 'INFO',
        message: `Tu ahorro proyectado es menor al 10% del ingreso. Intentá reducir gastos variables.`,
        metadata: {
          ahorroProy: ctx.income - ctx.burnRate * 30,
          tasaAhorro: ((ctx.income - ctx.burnRate * 30) / ctx.income) * 100,
        },
      }),
    },
  ];

  /** Ejecuta todas las reglas y retorna resultados completos */
  execute(context: RuleContext): RuleExecutionResult[] {
    return this.rules.map((rule) => {
      try {
        const triggered = rule.condition(context);
        return {
          triggered,
          ruleId: rule.id,
          ruleName: rule.name,
          action: triggered ? rule.action(context) : null,
        };
      } catch {
        return {
          triggered: false,
          ruleId: rule.id,
          ruleName: rule.name,
          action: null,
        };
      }
    });
  }

  /** Retorna solo las reglas que se dispararon */
  getTriggered(context: RuleContext): RuleExecutionResult[] {
    return this.execute(context).filter((r) => r.triggered);
  }
}
