import { Module } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AnalyticsModule } from 'src/analytics/analytics.module';
import { ResendModule } from 'src/resend/resend.module';
import { RemindersController } from './reminders.controller';

@Module({
  imports: [AnalyticsModule, ResendModule],
  providers: [RemindersService, PrismaService],
  controllers: [RemindersController],
})
export class RemindersModule {}
