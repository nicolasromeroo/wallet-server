import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGastosQuery } from '../get-gastos.query';
import { GastoRepository } from '../../repositories/gasto.repository';

@QueryHandler(GetGastosQuery)
export class GetGastosHandler implements IQueryHandler<GetGastosQuery> {
  constructor(private readonly gastoRepository: GastoRepository) {}

  async execute(query: GetGastosQuery) {
    return this.gastoRepository.findByUser(query.userId);
  }
}
