import { Module } from '@nestjs/common';
import { HistorialController } from './historial.controller';
import { HistorialService } from './historial.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HistorialController],
  providers: [HistorialService],
})
export class HistorialModule {}
