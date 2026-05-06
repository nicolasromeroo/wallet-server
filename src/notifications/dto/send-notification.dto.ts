import { IsString, IsOptional, IsIn } from 'class-validator';

export type NotificationChannel = 'email' | 'push' | 'in-app';
export type NotificationSeverity = 'info' | 'warning' | 'critical';

export class SendNotificationDto {
  @IsString()
  userId: string;

  @IsString()
  title: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsIn(['info', 'warning', 'critical'])
  severity?: NotificationSeverity;

  /** Canal(es) destino. Por defecto: in-app */
  @IsOptional()
  channels?: NotificationChannel[];
}
