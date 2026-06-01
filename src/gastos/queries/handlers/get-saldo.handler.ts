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
    const mes = query.mes ?? now.getMonth() + 1;
    const anio = query.anio ?? now.getFullYear();

    // Ejecutar queries secuenciales en lugar de paralelo para no agotar pool de conexiones
    const totalSueldosMes = await this.sueldoRepository.getSumByMonth(
      query.userId,
      mes,
      anio,
    );
    const totalGastosMes =
      await this.gastoRepository.getSumRegularByUserAndMonth(
        query.userId,
        mes,
        anio,
      );
    const totalSueldosHistorico = await this.sueldoRepository.getSumAll(
      query.userId,
    );
    const totalGastosHistorico = await this.gastoRepository.getSumRegularByUser(
      query.userId,
    );
    const totalGastosTodosHistorico = await this.gastoRepository.getSumByUser(
      query.userId,
    );

    const sueldoDelMes = totalSueldosMes;

    // El saldo descuenta TODOS los gastos (ordinarios + extraordinarios/fijos)
    const saldo = totalSueldosHistorico - totalGastosTodosHistorico;
    const porcentaje =
      sueldoDelMes > 0
        ? Math.round((totalGastosMes / sueldoDelMes) * 1000) / 10
        : 0;
    // Porcentaje histórico: cuánto del total de ingresos se consumió (mismo cálculo que saldo)
    const porcentajeHistorico =
      totalSueldosHistorico > 0
        ? Math.min(
            Math.round(
              (totalGastosTodosHistorico / totalSueldosHistorico) * 1000,
            ) / 10,
            100,
          )
        : 0;

    console.log('[DEBUG GetSaldo]', {
      userId: query.userId,
      totalSueldosHistorico,
      totalGastosRegularHistorico: totalGastosHistorico,
      totalGastosTodosHistorico,
      totalSueldosMes,
      sueldoDelMes,
      totalGastosMes,
      saldo,
    });

    return {
      saldo,
      sueldo: sueldoDelMes,
      totalGastos: totalGastosMes,
      totalIngresos: totalSueldosHistorico,
      porcentaje,
      porcentajeHistorico,
      alerta: porcentaje >= 80,
      _debug: { totalSueldosHistorico, totalGastosHistorico },
    };
  }
}
