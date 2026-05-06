import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetSaldoQuery } from '../get-saldo.query';
import { GastoRepository } from '../../repositories/gasto.repository';
import { SueldoRepository } from '../../../sueldos/repositories/sueldo.repository';

@QueryHandler(GetSaldoQuery)
export class GetSaldoHandler implements IQueryHandler<GetSaldoQuery> {
  constructor(
    private readonly gastoRepository: GastoRepository,
    private readonly sueldoRepository: SueldoRepository,
  ) {}

  async execute(query: GetSaldoQuery) {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    const [totalSueldos, totalGastos] = await Promise.all([
      this.sueldoRepository.getSumByMonth(query.userId, mes, anio),
      this.gastoRepository.getSumByUserAndMonth(query.userId, mes, anio),
    ]);

    const saldo = totalSueldos - totalGastos;
    const porcentaje =
      totalSueldos > 0
        ? Math.round((totalGastos / totalSueldos) * 1000) / 10
        : 0;

    return {
      saldo,
      sueldo: totalSueldos,
      totalGastos,
      porcentaje,
      alerta: porcentaje >= 80,
    };
  }
}
