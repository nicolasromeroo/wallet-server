import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateGastoCommand } from './commands/create-gasto.command';
import { UpdateGastoCommand } from './commands/update-gasto.command';
import { DeleteGastoCommand } from './commands/delete-gasto.command';
import { GetGastosPorMesQuery } from './queries/get-gastos-por-mes.query';
import { GetGastosQuery } from './queries/get-gastos.query';
import { GetSaldoQuery } from './queries/get-saldo.query';
import { GetGastoExcesivoQuery } from './queries/get-gasto-excesivo.query';

// Con CQRS, el Service ya no tiene lógica de negocio
// Solo actúa como dispatcher: recibe la intención y la despacha al bus correspondiente
@Injectable()
export class GastosService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  listar(userId: string) {
    return this.queryBus.execute(new GetGastosQuery(userId));
  }

  getSaldo(userId: string) {
    return this.queryBus.execute(new GetSaldoQuery(userId));
  }

  crearGasto(
    userId: string,
    monto: number,
    descripcion: string,
    esExtraordinario = false,
  ) {
    return this.commandBus.execute(
      new CreateGastoCommand(userId, monto, descripcion, esExtraordinario),
    );
  }

  actualizarGasto(
    gastoId: string,
    userId: string,
    monto?: number,
    descripcion?: string,
    esExtraordinario?: boolean,
  ) {
    return this.commandBus.execute(
      new UpdateGastoCommand(
        gastoId,
        userId,
        monto,
        descripcion,
        esExtraordinario,
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
}
