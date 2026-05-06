import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

// Controllers y Services
import { GastosController } from './gastos.controller';
import { GastosService } from './gastos.service';

// Repositories
import { GastoRepository } from './repositories/gasto.repository';
import { SueldoRepository } from '../sueldos/repositories/sueldo.repository';

// Command Handlers
import { CreateGastoHandler } from './commands/handlers/create-gasto.handler';
import { UpdateGastoHandler } from './commands/handlers/update-gasto.handler';
import { DeleteGastoHandler } from './commands/handlers/delete-gasto.handler';

// Query Handlers
import { GetGastosPorMesHandler } from './queries/handlers/get-gastos-por-mes.handler';
import { GetGastoExcesivoHandler } from './queries/handlers/get-gasto-excesivo.handler';
import { GetGastosHandler } from './queries/handlers/get-gastos.handler';
import { GetSaldoHandler } from './queries/handlers/get-saldo.handler';

// Event Handlers
import { GastoCreadoHandler } from './events/handlers/gasto-creado.handler';
import { PrismaModule } from 'src/prisma/prisma.module';

const CommandHandlers = [
  CreateGastoHandler,
  UpdateGastoHandler,
  DeleteGastoHandler,
];
const QueryHandlers = [
  GetGastosPorMesHandler,
  GetGastoExcesivoHandler,
  GetGastosHandler,
  GetSaldoHandler,
];
const EventHandlers = [GastoCreadoHandler];

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [GastosController],
  providers: [
    GastosService,
    GastoRepository,
    SueldoRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
  ],
  exports: [
    GastoRepository,
    SueldoRepository,
    GastosService,
    ...QueryHandlers,
    ...EventHandlers,
  ],
})
export class GastosModule {}
