import { Module } from '@nestjs/common';
import { GastoService } from './gasto.service';
import { GastoController } from './gasto.controller';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  controllers: [GastoController],
  providers: [GastoService, PrismaService],
})
export class GastoModule {}
