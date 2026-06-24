import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateGastoCommand } from './commands/create-gasto.command';
import { UpdateGastoCommand } from './commands/update-gasto.command';
import { DeleteGastoCommand } from './commands/delete-gasto.command';
import { GetGastosPorMesQuery } from './queries/get-gastos-por-mes.query';
import { GetGastosQuery } from './queries/get-gastos.query';
import { GetSaldoQuery } from './queries/get-saldo.query';
import { GetGastoExcesivoQuery } from './queries/get-gasto-excesivo.query';
import { PrismaService } from 'src/prisma/prisma.service';

// Con CQRS, el Service ya no tiene lógica de negocio
// Solo actúa como dispatcher: recibe la intención y la despacha al bus correspondiente
@Injectable()
export class GastosService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly prisma: PrismaService,
  ) {}

  listar(userId: string) {
    return this.queryBus.execute(new GetGastosQuery(userId));
  }

  getSaldo(userId: string, mes?: number, anio?: number) {
    return this.queryBus.execute(new GetSaldoQuery(userId, mes, anio));
  }

  crearGasto(
    userId: string,
    monto: number,
    descripcion: string,
    esExtraordinario = false,
    categoria?: string,
  ) {
    return this.commandBus.execute(
      new CreateGastoCommand(
        userId,
        monto,
        descripcion,
        esExtraordinario,
        categoria,
      ),
    );
  }

  actualizarGasto(
    gastoId: string,
    userId: string,
    monto?: number,
    descripcion?: string,
    esExtraordinario?: boolean,
    categoria?: string,
  ) {
    return this.commandBus.execute(
      new UpdateGastoCommand(
        gastoId,
        userId,
        monto,
        descripcion,
        esExtraordinario,
        categoria,
      ),
    );
  }

  eliminarGasto(gastoId: string, userId: string) {
    return this.commandBus.execute(new DeleteGastoCommand(gastoId, userId));
  }

  getGastosPorMes(userId: string, mes: number, anio: number) {
    return this.queryBus.execute(new GetGastosPorMesQuery(userId, mes, anio));
  }

  getGastoExcesivo(userId: string, monto: number) {
    return this.queryBus.execute(new GetGastoExcesivoQuery(userId, monto));
  }

  // seccion de logica de negocio para machine learning | microservicio de python + fastapi
  // resumen mensual (CSV -> raw.csv)
  async getResumenMensual(userId: string) {
    const rows = await this.prisma.$queryRaw`
      SELECT
        to_char(date_trunc('month', "fecha"), 'YYYY-MM') as mes,
        categoria as category,
        SUM(monto)::float as total_gastado,
        SUM(CASE WHEN "esExtraordinario" THEN monto ELSE 0 END)::float as gastos_fijos,
        SUM(CASE WHEN NOT "esExtraordinario" THEN monto ELSE 0 END)::float as gastos_variables,
        COUNT(*)::int as cantidad_transacciones,
        COUNT(DISTINCT date_trunc('day', "fecha"))::int as dias_con_gasto
      FROM "Gasto"
      WHERE "userId" = ${userId}
      GROUP BY date_trunc('month', "fecha"), categoria
      ORDER BY mes
    `;

    return rows;
  }
}
