import { Injectable, Logger, Optional } from '@nestjs/common';
import { ResendService } from 'nestjs-resend';

export interface ReminderData {
  userName: string;
  totalGastos: number;
  burnRate: number;
  burnRateProyectado: number;
  projectedSavings: number;
  topCategorias: { categoria: string; total: number; percentage: number }[];
  gastosExcesivos: { descripcion: string; monto: number; fecha: Date }[];
  notasRecientes: { title: string; description: string; createdAt: Date }[];
  mes: string;
  anio: number;
}

const FROM = 'Gastos App <onboarding@resend.dev>';

@Injectable()
export class EmailResendService {
  private readonly logger = new Logger(EmailResendService.name);
  private readonly isEnabled: boolean;

  constructor(@Optional() private readonly resendService?: ResendService) {
    // Si no hay Resend o no tiene apiKey válido, deshabilita emails
    this.isEnabled =
      !!resendService &&
      !!process.env.RESEND_API_KEY &&
      process.env.RESEND_API_KEY !== 'dummy-key-for-production';
    if (!this.isEnabled) {
      this.logger.warn(
        '⚠️ Email service disabled: missing RESEND_API_KEY or invalid config',
      );
    }
  }

  async sendTestEmail() {
    if (!this.isEnabled || !this.resendService) {
      this.logger.log('📧 Email service disabled, skipping test email');
      return { id: 'test-disabled', success: false };
    }
    try {
      return await this.resendService.send({
        from: FROM,
        to: 'nicromeroe@gmail.com',
        subject: 'mail de prueba',
        text: 'mail de prueba works!!',
      });
    } catch (err) {
      this.logger.error('❌ Failed to send test email:', err);
      return { error: err };
    }
  }

  async sendMonthlyResumen(to: string, data: ReminderData) {
    if (!this.isEnabled || !this.resendService) return { success: false };
    try {
      return await this.resendService.send({
        from: FROM,
        to,
        subject: `📊 Resumen de gastos — ${data.mes} ${data.anio}`,
        html: this.buildResumenMensualHtml(data),
      });
    } catch (err) {
      this.logger.error('❌ Failed to send monthly resumen:', err);
      return { error: err };
    }
  }

  async sendGastoExcesivoAlert(to: string, data: ReminderData) {
    if (!this.isEnabled || !this.resendService) return { success: false };
    try {
      return await this.resendService.send({
        from: FROM,
        to,
        subject: `⚠️ Alerta: gastos altos detectados este mes`,
        html: this.buildGastoExcesivoHtml(data),
      });
    } catch (err) {
      this.logger.error('❌ Failed to send gasto excesivo alert:', err);
      return { error: err };
    }
  }

  async sendNotasReminder(to: string, data: ReminderData) {
    if (!this.isEnabled || !this.resendService) return { success: false };
    try {
      return await this.resendService.send({
        from: FROM,
        to,
        subject: `📝 Tus notas recientes — ${data.mes} ${data.anio}`,
        html: this.buildNotasReminderHtml(data),
      });
    } catch (err) {
      this.logger.error('❌ Failed to send notas reminder:', err);
      return { error: err };
    }
  }

  async sendWeeklyResumen(to: string, data: ReminderData) {
    if (!this.isEnabled || !this.resendService) return { success: false };
    try {
      return await this.resendService.send({
        from: FROM,
        to,
        subject: `📅 Tu resumen semanal de gastos`,
        html: this.buildWeeklyHtml(data),
      });
    } catch (err) {
      this.logger.error('❌ Failed to send weekly resumen:', err);
      return { error: err };
    }
  }

  private buildResumenMensualHtml(d: ReminderData): string {
    const rows = d.topCategorias
      .slice(0, 5)
      .map(
        (c) => `
      <tr>
        <td style="padding:8px 12px;">${c.categoria || 'Sin categoría'}</td>
        <td style="padding:8px 12px; text-align:right;">$${c.total.toFixed(2)}</td>
        <td style="padding:8px 12px; text-align:right;">${c.percentage.toFixed(1)}%</td>
      </tr>`,
      )
      .join('');

    return `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;">
      <h2 style="color:#4f46e5;">📊 Resumen mensual — ${d.mes} ${d.anio}</h2>
      <p>Hola <strong>${d.userName}</strong>, acá va tu resumen de ${d.mes}:</p>
      <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="font-size:28px;font-weight:bold;color:#ef4444;margin:0;">$${d.totalGastos.toFixed(2)}</p>
        <p>Burn rate: <strong>$${d.burnRate.toFixed(2)}/día</strong> · Proyectado: <strong>$${d.burnRateProyectado.toFixed(2)}</strong></p>
        <p style="color:#${d.projectedSavings >= 0 ? '22c55e' : 'ef4444'};">Ahorro proyectado: <strong>$${d.projectedSavings.toFixed(2)}</strong></p>
      </div>
      ${
        rows
          ? `<div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;">
        <h3 style="margin-top:0;">🏷️ Top categorías</h3>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#f3f4f6;">
            <th style="padding:8px 12px;text-align:left;">Categoría</th>
            <th style="padding:8px 12px;text-align:right;">Total</th>
            <th style="padding:8px 12px;text-align:right;">%</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`
          : ''
      }
      <p style="color:#999;font-size:12px;text-align:center;">Gastos App</p>
    </div>`;
  }

  private buildGastoExcesivoHtml(d: ReminderData): string {
    const rows = d.gastosExcesivos
      .slice(0, 10)
      .map(
        (g) => `
      <tr>
        <td style="padding:8px 12px;">${g.descripcion}</td>
        <td style="padding:8px 12px;text-align:right;color:#ef4444;font-weight:bold;">$${g.monto.toFixed(2)}</td>
        <td style="padding:8px 12px;text-align:right;color:#999;">${new Date(g.fecha).toLocaleDateString('es-AR')}</td>
      </tr>`,
      )
      .join('');

    return `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;">
      <h2 style="color:#ef4444;">⚠️ Gastos altos detectados</h2>
      <p>Hola <strong>${d.userName}</strong>, detectamos gastos extraordinarios este mes:</p>
      <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#fef2f2;">
            <th style="padding:8px 12px;text-align:left;">Descripción</th>
            <th style="padding:8px 12px;text-align:right;">Monto</th>
            <th style="padding:8px 12px;text-align:right;">Fecha</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p style="color:#999;font-size:12px;text-align:center;">Gastos App</p>
    </div>`;
  }

  private buildNotasReminderHtml(d: ReminderData): string {
    const items = d.notasRecientes
      .slice(0, 5)
      .map(
        (n) => `
      <div style="border-left:3px solid #4f46e5;padding:8px 12px;margin:8px 0;background:#f5f3ff;">
        <strong>${n.title}</strong>
        <p style="margin:4px 0;color:#555;">${n.description}</p>
        <small style="color:#999;">${new Date(n.createdAt).toLocaleDateString('es-AR')}</small>
      </div>`,
      )
      .join('');

    return `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;">
      <h2 style="color:#4f46e5;">📝 Tus notas recientes</h2>
      <p>Hola <strong>${d.userName}</strong>, estas son tus notas de ${d.mes}:</p>
      <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;">
        ${items || '<p style="color:#999;">No tenés notas este mes.</p>'}
      </div>
      <p style="color:#999;font-size:12px;text-align:center;">Gastos App</p>
    </div>`;
  }

  private buildWeeklyHtml(d: ReminderData): string {
    return `<div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#f9f9f9;">
      <h2 style="color:#4f46e5;">📅 Resumen semanal</h2>
      <p>Hola <strong>${d.userName}</strong>, acá va tu semana:</p>
      <div style="background:#fff;border-radius:8px;padding:16px;margin:16px 0;">
        <p>💸 Gastos del mes: <strong style="color:#ef4444;">$${d.totalGastos.toFixed(2)}</strong></p>
        <p>🔥 Burn rate: <strong style="color:#f97316;">$${d.burnRate.toFixed(2)}/día</strong></p>
        <p>💰 Ahorro proyectado: <strong style="color:#${d.projectedSavings >= 0 ? '22c55e' : 'ef4444'};">$${d.projectedSavings.toFixed(2)}</strong></p>
      </div>
      <p style="color:#999;font-size:12px;text-align:center;">Gastos App</p>
    </div>`;
  }
}
