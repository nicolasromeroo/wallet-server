import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { UpdateGastoCommand } from '../update-gasto.command';
import { GastoRepository } from '../../repositories/gasto.repository';

@CommandHandler(UpdateGastoCommand)
export class UpdateGastoHandler implements ICommandHandler<UpdateGastoCommand> {
  constructor(private readonly gastoRepository: GastoRepository) {}

  async execute(command: UpdateGastoCommand) {
    const { gastoId, monto, descripcion, esExtraordinario } = command;

    const existing = await this.gastoRepository.findById(gastoId);
    if (!existing) {
      throw new NotFoundException(`Gasto con id ${gastoId} no encontrado.`);
    }

    return this.gastoRepository.update(gastoId, {
      monto,
      descripcion,
      esExtraordinario,
    });
  }
}
