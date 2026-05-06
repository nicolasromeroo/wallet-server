import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/**
 * NotificationsModule
 * ─────────────────────────────────────────────────────────────────────────────
 * Módulo global de notificaciones. Exporta NotificationsService para que
 * cualquier otro módulo (AutomationModule, GastosModule, etc.) pueda inyectarlo
 * sin necesidad de re-importar el módulo completo.
 *
 * Para activar los canales de notificación:
 *  • Email  → importar MailerModule aquí y inyectar MailerService en el service
 *  • Push   → no requiere módulo adicional, solo configurar VAPID en .env
 *  • InApp  → importar EventEmitterModule o conectar el WebSocket Gateway aquí
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
