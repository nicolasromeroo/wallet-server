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

    const [
      totalSueldosMes,
      totalGastosMes,
      totalSueldosHistorico,
      totalGastosHistorico,
    ] = await Promise.all([
      this.sueldoRepository.getSumByMonth(query.userId, mes, anio),
      this.gastoRepository.getSumRegularByUserAndMonth(query.userId, mes, anio),
      this.sueldoRepository.getSumAll(query.userId),
      this.gastoRepository.getSumRegularByUser(query.userId),
    ]);

    const saldo = totalSueldosHistorico - totalGastosHistorico;
    const porcentaje =
      totalSueldosMes > 0
        ? Math.round((totalGastosMes / totalSueldosMes) * 1000) / 10
        : 0;

    console.log('[DEBUG GetSaldo]', {
      userId: query.userId,
      totalSueldosHistorico,
      totalGastosHistorico,
      totalSueldosMes,
      totalGastosMes,
      saldo,
    });

    return {
      saldo,
      sueldo: totalSueldosMes,
      totalGastos: totalGastosMes,
      porcentaje,
      alerta: porcentaje >= 80,
      _debug: { totalSueldosHistorico, totalGastosHistorico },
    };
  }
}
