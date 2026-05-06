import { Injectable, Logger } from '@nestjs/common';
import { SendNotificationDto } from './dto/send-notification.dto';

/**
 * NotificationsService
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio central de notificaciones. Actualmente todas las vías están
 * preparadas (stubbed) y listas para conectar con:
 *
 *  • Nodemailer  → instalar: npm i nodemailer @nestjs/mailer
 *    Docs: https://nest.land/package/@nestjs-modules/mailer
 *
 *  • Web Push    → instalar: npm i web-push
 *    Docs: https://github.com/web-push-libs/web-push
 *    Genera las claves VAPID con: npx web-push generate-vapid-keys
 *    Agregar al .env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *
 *  • In-App      → usa EventEmitter2 para disparar eventos en tiempo real.
 *    Conectar con WebSockets (Gateway) o Server-Sent Events según preferencia.
 * ─────────────────────────────────────────────────────────────────────────────
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // ─── Nodemailer ────────────────────────────────────────────────────────────
  /**
   * Envía un correo electrónico al usuario.
   *
   * Para activar: instalar @nestjs-modules/mailer + nodemailer y configurar
   * MailerModule en NotificationsModule con las credenciales SMTP del .env.
   *
   * Variables .env necesarias:
   *   MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM
   */
  async sendEmail(to: string, subject: string, body: string): Promise<void> {
    // TODO: reemplazar este stub con MailerService.sendMail(...)
    this.logger.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`);
    this.logger.debug(`Body preview: ${body.slice(0, 100)}`);

    /* Implementación futura:
    await this.mailerService.sendMail({
      to,
      subject,
      html: body,
    });
    */
  }

  // ─── Web Push ──────────────────────────────────────────────────────────────
  /**
   * Envía una notificación push al navegador del usuario.
   *
   * Para activar:
   *  1. npm i web-push
   *  2. Guardar la suscripción del cliente (PushSubscription) en la DB
   *     cuando el usuario acepta notificaciones desde el frontend.
   *  3. Reemplazar el stub con webpush.sendNotification(subscription, payload)
   *
   * Variables .env necesarias:
   *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:tu@email.com)
   */
  async sendPushNotification(
    userId: string,
    title: string,
    body: string,
  ): Promise<void> {
    // TODO: buscar la PushSubscription del userId en la DB y llamar webpush
    this.logger.log(`[PUSH STUB] UserId: ${userId} | Title: ${title}`);

    /* Implementación futura:
    import * as webpush from 'web-push';

    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    const subscription = await this.prisma.pushSubscription.findFirst({
      where: { userId },
    });
    if (!subscription) return;

    await webpush.sendNotification(
      subscription.endpoint as webpush.PushSubscription,
      JSON.stringify({ title, body }),
    );
    */
  }

  // ─── In-App ────────────────────────────────────────────────────────────────
  /**
   * Dispara una notificación en tiempo real dentro de la app.
   *
   * Para activar con WebSockets: instalar @nestjs/websockets @nestjs/platform-socket.io socket.io
   * Para activar con SSE: usar @Sse() + Observable en el controller.
   *
   * Por ahora emite un log que puede interceptarse con EventEmitter2.
   */
  async sendInAppNotification(
    userId: string,
    message: string,
    severity: 'info' | 'warning' | 'critical' = 'info',
  ): Promise<void> {
    this.logger.log(
      `[IN-APP STUB] UserId: ${userId} | Severity: ${severity} | Message: ${message}`,
    );

    /* Implementación futura con EventEmitter2:
    this.eventEmitter.emit('notification.inapp', {
      userId,
      message,
      severity,
      createdAt: new Date(),
    });
    */

    /* Implementación futura con WebSocket Gateway:
    this.notificationsGateway.sendToUser(userId, {
      type: 'NOTIFICATION',
      message,
      severity,
    });
    */
  }

  // ─── Método unificado ──────────────────────────────────────────────────────
  /**
   * Punto de entrada principal. Enruta a los canales indicados en el DTO.
   * Por defecto solo envía in-app si no se especifica channels.
   */
  async notify(dto: SendNotificationDto): Promise<void> {
    const channels = dto.channels ?? ['in-app'];

    const tasks: Promise<void>[] = [];

    if (channels.includes('in-app')) {
      tasks.push(
        this.sendInAppNotification(
          dto.userId,
          dto.body,
          dto.severity ?? 'info',
        ),
      );
    }

    if (channels.includes('email')) {
      tasks.push(this.sendEmail(dto.userId, dto.title, dto.body));
    }

    if (channels.includes('push')) {
      tasks.push(this.sendPushNotification(dto.userId, dto.title, dto.body));
    }

    await Promise.allSettled(tasks);
  }
}
