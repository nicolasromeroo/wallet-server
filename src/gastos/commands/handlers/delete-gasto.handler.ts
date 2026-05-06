import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeleteGastoCommand } from '../delete-gasto.command';
import { GastoRepository } from '../../repositories/gasto.repository';

@CommandHandler(DeleteGastoCommand)
export class DeleteGastoHandler implements ICommandHandler<DeleteGastoCommand> {
  constructor(private readonly gastoRepository: GastoRepository) {}

  async execute(command: DeleteGastoCommand) {
    const { gastoId, userId } = command;

    const existing = await this.gastoRepository.findById(gastoId);
    if (!existing) {
      throw new NotFoundException(`Gasto con id ${gastoId} no encontrado.`);
    }
    if (existing.userId !== userId) {
      throw new ForbiddenException(
        'No tenés permiso para eliminar este gasto.',
      );
    }

    return this.gastoRepository.delete(gastoId);
  }
}
