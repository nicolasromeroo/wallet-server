import { Controller, Post, UseGuards, Req } from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@Controller('reminders')
@UseGuards(JwtGuard)
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post('test/monthly')
  testMonthly() {
    return this.remindersService.sendMonthlyResumen();
  }

  @Post('test/weekly')
  testWeekly() {
    return this.remindersService.sendWeeklyResumen();
  }

  @Post('test/gastos-excesivos')
  testGastosExcesivos() {
    return this.remindersService.sendGastosExcesivosAlert();
  }

  @Post('test/notas')
  testNotas() {
    return this.remindersService.sendNotasReminder();
  }
}
