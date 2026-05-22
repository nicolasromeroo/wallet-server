import { Controller, Post } from '@nestjs/common';
import { EmailResendService } from './resend.service';

@Controller('resend')
export class ResendController {
  constructor(private readonly emailResendService: EmailResendService) {}

  @Post('test-email')
  async sendTestEmail() {
    return this.emailResendService.sendTestEmail();
  }
}
