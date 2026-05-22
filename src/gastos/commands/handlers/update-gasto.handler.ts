import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { UpdateGastoCommand } from '../update-gasto.command';
import { GastoRepository } from '../../repositories/gasto.repository';

@CommandHandler(UpdateGastoCommand)
export class UpdateGastoHandler implements ICommandHandler<UpdateGastoCommand> {
  constructor(private readonly gastoRepository: GastoRepository) {}

  async execute(command: UpdateGastoCommand) {
    const { gastoId, monto, descripcion, esExtraordinario, categoria } =
      command;

    const existing = await this.gastoRepository.findById(gastoId);
    if (!existing) {
      throw new NotFoundException(`Gasto con id ${gastoId} no encontrado.`);
    }

    // Solo incluir campos que efectivamente vienen (no undefined)
    const updateData: any = {};

    if (monto !== undefined) {
      updateData.monto = monto;
    }
    if (descripcion !== undefined) {
      updateData.descripcion = descripcion;
    }
    if (esExtraordinario !== undefined) {
      updateData.esExtraordinario = esExtraordinario;
    }
    if (categoria !== undefined) {
      updateData.categoria = categoria || null; // "" → null, con valor → se guarda
    }

    console.log('[UPDATE-GASTO] updateData:', updateData);

    const result = await this.gastoRepository.update(gastoId, updateData);

    console.log('[UPDATE-GASTO] resultado guardado:', result);
    return result;
  }
}
