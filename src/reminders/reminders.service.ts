import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { EmailResendService, ReminderData } from 'src/resend/resend.service';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
    private readonly emailService: EmailResendService,
  ) {}

  // ─── Resumen mensual — el 1° de cada mes a las 9am ───────────────────────
  @Cron('0 9 1 * *')
  async sendMonthlyResumen() {
    this.logger.log('⏰: enviando resumen mensual...');
    const users = await this.prisma.user.findMany();
    const now = new Date();
    const mes = MESES[now.getMonth()];

    for (const user of users) {
      try {
        const data = await this.buildReminderData(
          user.id,
          user.name,
          mes,
          now.getFullYear(),
        );
        await this.emailService.sendMonthlyResumen(user.email, data);
        this.logger.log(`✅ Resumen mensual enviado a ${user.email}`);
      } catch (err) {
        this.logger.error(`❌ Error enviando a ${user.email}:`, err);
      }
    }
  }

  // ─── Resumen semanal — todos los lunes a las 9am ─────────────────────────
  @Cron('0 9 * * 1')
  async sendWeeklyResumen() {
    this.logger.log('⏰: enviando resumen semanal...');
    const users = await this.prisma.user.findMany();
    const now = new Date();
    const mes = MESES[now.getMonth()];

    for (const user of users) {
      try {
        const data = await this.buildReminderData(
          user.id,
          user.name,
          mes,
          now.getFullYear(),
        );
        await this.emailService.sendWeeklyResumen(user.email, data);
        this.logger.log(`✅ Resumen semanal enviado a ${user.email}`);
      } catch (err) {
        this.logger.error(`❌ Error enviando a ${user.email}:`, err);
      }
    }
  }

  // ─── Alerta gastos excesivos — todos los días a las 8pm ──────────────────
  @Cron('0 20 * * *')
  async sendGastosExcesivosAlert() {
    this.logger.log('⏰: verificando gastos excesivos...');
    const now = new Date();
    const mes = MESES[now.getMonth()];
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const users = await this.prisma.user.findMany();

    for (const user of users) {
      try {
        const gastosExcesivos = await this.prisma.gasto.findMany({
          where: {
            userId: user.id,
            esExtraordinario: true,
            fecha: { gte: start },
          },
          orderBy: { monto: 'desc' },
        });

        if (gastosExcesivos.length === 0) continue; // no enviar si no hay nada

        const data = await this.buildReminderData(
          user.id,
          user.name,
          mes,
          now.getFullYear(),
        );
        await this.emailService.sendGastoExcesivoAlert(user.email, data);
        this.logger.log(`✅ Alerta gastos enviada a ${user.email}`);
      } catch (err) {
        this.logger.error(`❌ Error enviando a ${user.email}:`, err);
      }
    }
  }

  // ─── Recordatorio de notas — todos los viernes a las 6pm ─────────────────
  @Cron('0 18 * * 5')
  async sendNotasReminder() {
    this.logger.log('⏰: enviando recordatorio de notas...');
    const now = new Date();
    const mes = MESES[now.getMonth()];
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const users = await this.prisma.user.findMany();

    for (const user of users) {
      try {
        const notasRecientes = await this.prisma.note.findMany({
          where: { userId: user.id, createdAt: { gte: start } },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });

        if (notasRecientes.length === 0) continue;

        const data = await this.buildReminderData(
          user.id,
          user.name,
          mes,
          now.getFullYear(),
        );
        await this.emailService.sendNotasReminder(user.email, data);
        this.logger.log(`✅ Recordatorio notas enviado a ${user.email}`);
      } catch (err) {
        this.logger.error(`❌ Error enviando a ${user.email}:`, err);
      }
    }
  }

  // ─── Helper: arma el objeto ReminderData para un usuario ─────────────────
  private async buildReminderData(
    userId: string,
    userName: string,
    mes: string,
    anio: number,
  ): Promise<ReminderData> {
    const now = new Date();
    const start = new Date(anio, now.getMonth(), 1);

    const [
      burnRateData,
      savingsData,
      categoriasData,
      gastosExcesivos,
      notasRecientes,
    ] = await Promise.all([
      this.analyticsService.getBurnRate(userId),
      this.analyticsService.getProjectedSavings(userId),
      this.analyticsService.getCategoryBreakdown(userId),
      this.prisma.gasto.findMany({
        where: { userId, esExtraordinario: true, fecha: { gte: start } },
        orderBy: { monto: 'desc' },
        take: 10,
      }),
      this.prisma.note.findMany({
        where: { userId, createdAt: { gte: start } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    return {
      userName,
      totalGastos: burnRateData.totalGastos,
      burnRate: burnRateData.burnRate,
      burnRateProyectado: burnRateData.burnRateProyectado,
      projectedSavings: savingsData.projectedSavings,
      topCategorias: categoriasData,
      gastosExcesivos,
      notasRecientes,
      mes,
      anio,
    };
  }
}
