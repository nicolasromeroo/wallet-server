import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException } from '@nestjs/common';
import { CreateGastoCommand } from '../create-gasto.command';
import { GastoRepository } from '../../repositories/gasto.repository';
import { SueldoRepository } from '../../../sueldos/repositories/sueldo.repository';
import { GastoCreadoEvent } from '../../events/gasto-creado.event';

// el Handler tiene la lógica de negocio real
// separa la responsabilidad del Service (que solo despacha), del Handler (que ejecuta)
@CommandHandler(CreateGastoCommand)
export class CreateGastoHandler implements ICommandHandler<CreateGastoCommand> {
  constructor(
    private readonly gastoRepository: GastoRepository,
    private readonly sueldoRepository: SueldoRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: CreateGastoCommand) {
    const { userId, monto, descripcion, esExtraordinario } = command;

    // Validación de negocio: sueldo registrado
    const sueldo = await this.sueldoRepository.findActual(userId);
    if (!sueldo) {
      throw new BadRequestException(
        'No tenés sueldo registrado. Registrá un sueldo antes de agregar gastos.',
      );
    }

    // Gastos extraordinarios (ej: alquiler) saltan la validación de saldo
    if (!esExtraordinario) {
      const [totalSueldos, totalGastos] = await Promise.all([
        this.sueldoRepository.getSumAll(userId),
        this.gastoRepository.getSumByUser(userId),
      ]);

      const saldo = totalSueldos - totalGastos;

      if (monto > saldo) {
        throw new BadRequestException(
          `Saldo insuficiente. Tu saldo disponible es $${saldo.toFixed(2)} y estás intentando gastar $${monto.toFixed(2)}.`,
        );
      }
    }

    const gasto = await this.gastoRepository.create({
      userId,
      monto,
      descripcion,
      esExtraordinario: esExtraordinario ?? false,
    });

    this.eventEmitter.emit(
      'gasto.creado',
      new GastoCreadoEvent(gasto.id, userId, monto),
    );

    return gasto;
  }
}
