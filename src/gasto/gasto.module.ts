import { Module } from '@nestjs/common';
import { GastoService } from './gasto.service';
import { GastoController } from './gasto.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [GastoController],
  providers: [GastoService],
})
export class GastoModule {}
