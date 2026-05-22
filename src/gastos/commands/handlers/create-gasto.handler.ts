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
    const { userId, monto, descripcion, esExtraordinario, categoria } = command;

    const sueldo = await this.sueldoRepository.findActual(userId);
    if (!sueldo) {
      throw new BadRequestException(
        'No tenés sueldo registrado. Registrá un sueldo antes de agregar gastos.',
      );
    }

    // gastos 'extraordinarios' (ej: alquiler) saltan la validación de saldo.
    // para desactivar esta funcion simplemente no envíes el campo esExtraordinario o envíalo como false.
    // aclaracion: en la UI gasto 'extraordinario' es gasto 'fijo' (ej: alquiler, servicios).
    if (!esExtraordinario) {
      // Queries secuenciales para no agotar el pool de conexiones
      const totalSueldos = await this.sueldoRepository.getSumAll(userId);
      const totalGastos =
        await this.gastoRepository.getSumRegularByUser(userId);

      const saldo = totalSueldos - totalGastos;

      console.log('[DEBUG CREATE-GASTO]', {
        userId,
        monto,
        totalSueldos,
        totalGastos,
        saldo,
      });

      if (monto > saldo) {
        throw new BadRequestException(
          `Saldo insuficiente. Sueldos: $${totalSueldos} | Gastos regulares: $${totalGastos} | Saldo: $${saldo.toFixed(2)} | Intentás gastar: $${monto.toFixed(2)}.`,
        );
      }
    }

    const gasto = await this.gastoRepository.create({
      userId,
      monto,
      descripcion,
      esExtraordinario: esExtraordinario ?? false,
      categoria: categoria || undefined,
    });

    this.eventEmitter.emit(
      'gasto.creado',
      new GastoCreadoEvent(gasto.id, userId, monto),
    );

    return gasto;
  }
}
