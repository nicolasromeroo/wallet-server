import { Module } from '@nestjs/common';
import { PlusService } from './plus.service';
import { PlusController } from './plus.controller';

@Module({
  controllers: [PlusController],
  providers: [PlusService],
})
export class PlusModule {}
