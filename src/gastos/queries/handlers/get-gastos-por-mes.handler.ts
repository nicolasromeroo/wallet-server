import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGastosPorMesQuery } from '../get-gastos-por-mes.query';
import { GastoRepository } from '../../repositories/gasto.repository';

@QueryHandler(GetGastosPorMesQuery)
export class GetGastosPorMesHandler implements IQueryHandler<GetGastosPorMesQuery> {
  constructor(private readonly gastoRepository: GastoRepository) {}

  async execute(query: GetGastosPorMesQuery) {
    return this.gastoRepository.findByUserAndMonth(
      query.userId,
      query.mes,
      query.anio,
    );
  }
}
