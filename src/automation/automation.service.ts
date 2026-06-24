import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { RulesEngine } from './rules/rules.engine';
import { NotificationHandler } from './handlers/notification.handler';
import { RuleContext, RuleExecutionResult } from './rules/rules.types';
import { AnalyticsService } from '../analytics/analytics.service';
import { GastoCreadoEvent } from '../gastos/events/gasto-creado.event';
import { MlService } from '../ml/services/ml.service';
import { NotificationsService } from '../notifications/notifications.service';

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
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly rulesEngine: RulesEngine,
    private readonly notificationHandler: NotificationHandler,
    private readonly analyticsService: AnalyticsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mlService: MlService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Escucha el evento de gasto creado y corre el pipeline automáticamente */
  @OnEvent('gasto.creado', { async: true })
  async onGastoCreado(event: GastoCreadoEvent): Promise<void> {
    await this.runRulesForUser(
      event.userId,
      event.monto,
      `gasto:${event.gastoId}`,
    );
    // Chequeo de anomalía del gasto recién cargado (proactivo, no bloqueante).
    await this.checkAnomalyForNewGasto(event);
  }

  /**
   * Corre el detector ML sobre el gasto recién creado. Si resultó inusual,
   * dispara una notificación por el canal proactivo (NotificationsService).
   * Esto NO toca el feed de reglas del dashboard (la sección IA ya escanea en
   * vivo): es el canal para avisar al instante por in-app / push / email.
   */
  private async checkAnomalyForNewGasto(
    event: GastoCreadoEvent,
  ): Promise<void> {
    try {
      const anomaly = await this.mlService.checkGastoAnomaly(
        event.userId,
        event.gastoId,
      );
      if (!anomaly) return;

      await this.notifications.notify({
        userId: event.userId,
        title: 'Gasto inusual detectado',
        body: anomaly.reason,
        severity: anomaly.level === 'muy_inusual' ? 'warning' : 'info',
        channels: ['in-app'],
      });
      this.logger.log(
        `Anomalía proactiva (${anomaly.kind}) para gasto ${event.gastoId}: ${anomaly.reason}`,
      );
    } catch (err: any) {
      // Nunca debe romper la creación del gasto.
      this.logger.warn(`Chequeo de anomalía falló: ${err.message}`);
    }
  }

  /** Construye el RuleContext con los datos financieros actuales del usuario. */
  private async buildContext(
    userId: string,
    lastGastoMonto = 0,
    lastGastoDescripcion = '',
  ): Promise<RuleContext> {
    const now = new Date();

    const [burnRate, savings, categories] = await Promise.all([
      this.analyticsService.getBurnRate(userId),
      this.analyticsService.getProjectedSavings(userId),
      this.analyticsService.getCategoryBreakdown(userId),
    ]);

    const getCat = (name: string) =>
      categories.find((c) => c.categoria.toUpperCase() === name)?.total ?? 0;

    return {
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
  }

  /**
   * Evalúa las reglas en VIVO y devuelve las activadas, SIN efectos secundarios
   * (no persiste ni emite eventos). Es la fuente del diagnóstico del dashboard:
   * las alertas reflejan la situación actual y desaparecen solas al corregir la
   * causa, sin necesidad de "limpiar".
   */
  async evaluateRules(userId: string): Promise<RuleExecutionResult[]> {
    const context = await this.buildContext(userId);
    return this.rulesEngine.getTriggered(context);
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

    const context = await this.buildContext(
      userId,
      lastGastoMonto,
      lastGastoDescripcion,
    );

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
