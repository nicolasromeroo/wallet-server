import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MlModule } from '../ml/ml.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { RulesEngine } from './rules/rules.engine';
import { NotificationHandler } from './handlers/notification.handler';

@Module({
  imports: [PrismaModule, AnalyticsModule, MlModule, NotificationsModule],
  controllers: [AutomationController],
  providers: [AutomationService, RulesEngine, NotificationHandler],
  exports: [AutomationService],
})
export class AutomationModule {}
