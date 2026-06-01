import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RulesEngine } from './rules/rules.engine';
import { NotificationHandler } from './handlers/notification.handler';
import { RuleContext, RuleExecutionResult } from './rules/rules.types';
import { AnalyticsService } from '../analytics/analytics.service';
import { GastoCreadoEvent } from '../gastos/events/gasto-creado.event';

/**
 * Automation Service — orquesta el pipeline de automatización:
 *
 *   1. Evento gasto.creado / trigger manual
 *   2. Construir RuleContext con datos actuales del usuario
 *   3. RulesEngine evalúa condiciones
 *   4. Emite 'rule.triggered' para cada regla activada
 *   5. NotificationHandler recibe y persiste la notificación
 *
 * Es el punto de entrada para integrar ML + Analytics + Reglas de negocio.
 */
@Injectable()
export class AutomationService {
  constructor(
    private readonly rulesEngine: RulesEngine,
    private readonly notificationHandler: NotificationHandler,
    private readonly analyticsService: AnalyticsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** Escucha el evento de gasto creado y corre el pipeline automáticamente */
  @OnEvent('gasto.creado', { async: true })
  async onGastoCreado(event: GastoCreadoEvent): Promise<void> {
    await this.runRulesForUser(
      event.userId,
      event.monto,
      `gasto:${event.gastoId}`,
    );
  }

  /** Ejecuta el motor de reglas para un usuario y emite eventos para cada hit */
  async runRulesForUser(
    userId: string,
    lastGastoMonto = 0,
    lastGastoDescripcion = '',
    resetNotifications = false,
  ): Promise<RuleExecutionResult[]> {
    if (resetNotifications) {
      this.notificationHandler.clearNotifications(userId);
    }

    const now = new Date();

    const [burnRate, savings, categories] = await Promise.all([
      this.analyticsService.getBurnRate(userId),
      this.analyticsService.getProjectedSavings(userId),
      this.analyticsService.getCategoryBreakdown(userId),
    ]);

    const getCat = (name: string) =>
      categories.find((c) => c.categoria.toUpperCase() === name)?.total ?? 0;

    const context: RuleContext = {
      userId,
      comida: getCat('COMIDA'),
      transporte: getCat('TRANSPORTE'),
      entretenimiento: getCat('ENTRETENIMIENTO'),
      salud: getCat('SALUD'),
      educacion: getCat('EDUCACION'),
      hogar: getCat('HOGAR'),
      tecnologia: getCat('TECNOLOGIA'),
      otros: getCat('OTROS'),
      totalGastos: burnRate.totalGastos,
      income: savings.income,
      burnRate: burnRate.burnRate,
      lastGastoMonto,
      lastGastoDescripcion,
      mes: now.getMonth() + 1,
      anio: now.getFullYear(),
    };

    const triggered = this.rulesEngine.getTriggered(context);

    for (const result of triggered) {
      this.eventEmitter.emit('rule.triggered', {
        userId,
        action: result.action,
        timestamp: new Date(),
      });
    }

    return triggered;
  }

  getInsights(userId: string) {
    return this.notificationHandler
      .getNotifications(userId)
      .map((notification) => ({
        id: notification.timestamp.getTime().toString(),
        type: notification.action.type,
        severity: notification.action.severity,
        message: notification.action.message,
        metadata: notification.action.metadata,
        createdAt: notification.timestamp.toISOString(),
      }));
  }

  clearInsights(userId: string) {
    this.notificationHandler.clearNotifications(userId);
    return { cleared: true };
  }
}
