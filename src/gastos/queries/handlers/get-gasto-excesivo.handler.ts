import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GastoRepository } from 'src/gastos/repositories/gasto.repository';
import { GetGastoExcesivoQuery } from '../get-gasto-excesivo.query';

@QueryHandler(GetGastoExcesivoQuery)
export class GetGastoExcesivoHandler implements IQueryHandler<GetGastoExcesivoQuery> {
  constructor(private readonly gastoRepository: GastoRepository) {}

  async execute(query: GetGastoExcesivoQuery) {
    return this.gastoRepository.checkGastoExcesivo(query.userId, query.monto);
  }
}
