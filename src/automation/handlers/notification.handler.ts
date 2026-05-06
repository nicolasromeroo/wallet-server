import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RuleAction } from '../rules/rules.types';
import { GastoCreadoEvent } from '../../gastos/events/gasto-creado.event';

export interface NotificationPayload {
  userId: string;
  action: RuleAction;
  timestamp: Date;
}

/**
 * Notification Handler — persiste notificaciones en memoria y escucha eventos.
 *
 * En producción, este handler se reemplazaría/extendería con:
 *   - BullMQ → cola de emails
 *   - FCM/APNs → push notifications
 *   - WebSocket → notificaciones en tiempo real
 */
@Injectable()
export class NotificationHandler {
  private readonly logger = new Logger(NotificationHandler.name);
  private readonly notifications = new Map<string, NotificationPayload[]>();
  private readonly MAX_PER_USER = 50;

  /** Escucha eventos emitidos por AutomationService cuando una regla se dispara */
  @OnEvent('rule.triggered')
  handleRuleTriggered(payload: NotificationPayload): void {
    const list = this.notifications.get(payload.userId) ?? [];
    list.push(payload);

    // Evitar crecimiento ilimitado en memoria
    if (list.length > this.MAX_PER_USER) {
      list.splice(0, list.length - this.MAX_PER_USER);
    }

    this.notifications.set(payload.userId, list);
    this.logger.log(
      `[${payload.action.severity}] ${payload.userId}: ${payload.action.message}`,
    );
  }

  /** Escucha cuando se crea un gasto para log y trigger de pipeline */
  @OnEvent('gasto.creado')
  handleGastoCreado(event: GastoCreadoEvent): void {
    this.logger.log(
      `[gasto.creado] userId=${event.userId} | $${event.monto} | gastoId=${event.gastoId}`,
    );
  }

  getNotifications(userId: string): NotificationPayload[] {
    return this.notifications.get(userId) ?? [];
  }

  clearNotifications(userId: string): void {
    this.notifications.delete(userId);
  }
}
