import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { GastoModule } from './gasto/gasto.module';
import { GastosModule } from './gastos/gastos.module';
import { SueldosModule } from './sueldos/sueldos.module';
import { SueldosService } from './sueldos/sueldos.service';
import { SueldosController } from './sueldos/sueldos.controller';
import { PrismaService } from './prisma/prisma.service';
import { PlusModule } from './plus/plus.module';
// import { ProyeccionModule } from './proyeccion/proyeccion.module';
import { NotesModule } from './notes/notes.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MlModule } from './ml/ml.module';
import { AutomationModule } from './automation/automation.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    EventEmitterModule.forRoot(), // Habilita el sistema de eventos a nivel global
    ScheduleModule.forRoot(), // Habilita cron jobs (@Cron)
    AuthModule,
    SueldosModule,
    GastoModule,
    GastosModule, // nuevo módulo CQRS — rutas en /gastos
    PlusModule,
    // ProyeccionModule,
    NotesModule,
    AnalyticsModule, // métricas avanzadas: burn rate, ahorro proyectado, categorías
    MlModule, // clasificador y forecast con TensorFlow.js
    AutomationModule, // motor de reglas + pipeline de eventos
    NotificationsModule, // email (Nodemailer) · push (web-push) · in-app listo para conectar
  ],
  controllers: [AppController, SueldosController],
  providers: [AppService, SueldosService, PrismaService],
})
export class AppModule {}
