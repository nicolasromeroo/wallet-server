import { Module } from '@nestjs/common';
import { ResendModule as ResendLibModule } from 'nestjs-resend';
import { EmailResendService } from './resend.service';
import { ResendController } from './resend.controller';

@Module({
  imports: [
    ResendLibModule.forRootAsync({
      useFactory: async () => ({
        apiKey: process.env.RESEND_API_KEY,
      }),
    }),
  ],
  providers: [EmailResendService],
  exports: [EmailResendService],
  controllers: [ResendController],
})
export class ResendModule {}
