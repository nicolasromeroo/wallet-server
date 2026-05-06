import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import { GastoCreadoEvent } from '../gasto-creado.event';
import { SueldoRepository } from '../../../sueldos/repositories/sueldo.repository';
import { GastoRepository } from '../../repositories/gasto.repository';

// Este handler reacciona al evento 'gasto.creado' de forma async y desacoplada
// El CreateGastoHandler no sabe que este existe, no hay acoplamiento directo
@Injectable()
export class GastoCreadoHandler {
  private readonly logger = new Logger(GastoCreadoHandler.name);

  constructor(
    private readonly sueldoRepository: SueldoRepository,
    private readonly gastoRepository: GastoRepository,
  ) {}

  @OnEvent('gasto.creado', { async: true })
  async handleGastoCreado(event: GastoCreadoEvent): Promise<void> {
    const sueldo = await this.sueldoRepository.findActual(event.userId);
    if (!sueldo || sueldo.monto === 0) return;

    const totalGastos = await this.gastoRepository.getSumByUser(event.userId);
    const porcentaje = (totalGastos / sueldo.monto) * 100;

    this.logger.log(
      `[gasto.creado] userId=${event.userId} | gastos=$${totalGastos.toFixed(2)} | sueldo=$${sueldo.monto.toFixed(2)} | uso=${porcentaje.toFixed(1)}%`,
    );

    if (porcentaje >= 80) {
      this.logger.warn(
        `🚨 ALERTA: El usuario ${event.userId} consumió el ${porcentaje.toFixed(1)}% de su sueldo (ocurridoEn: ${event.ocurridoEn.toISOString()})`,
      );
      // TODO: aquí irá el job de BullMQ para enviar email/push notification
    }
  }
}
