import {
  Controller,
  Get,
  Post,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AutomationService } from './automation.service';

@UseGuards(JwtGuard)
@Controller('automation')
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  /**
   * POST /automation/run-rules
   * Ejecuta manualmente el motor de reglas para el usuario autenticado.
   * Retorna las reglas que se dispararon con sus mensajes.
   */
  @Post('run-rules')
  @HttpCode(HttpStatus.OK)
  runRules(@Request() req: any) {
    return this.automationService.runRulesForUser(req.user.id, 0, '', true);
  }

  /**
   * GET /automation/evaluate
   * Evalúa las reglas EN VIVO contra la situación actual del usuario, sin
   * persistir ni disparar notificaciones. Es la fuente del diagnóstico del
   * dashboard (idempotente).
   */
  @Get('evaluate')
  evaluate(@Request() req: any) {
    return this.automationService.evaluateRules(req.user.id);
  }

  /**
   * GET /automation/insights
   * Devuelve todas las notificaciones/alertas pendientes del usuario.
   */
  @Get('insights')
  getInsights(@Request() req: any) {
    return this.automationService.getInsights(req.user.id);
  }

  /**
   * DELETE /automation/insights
   * Limpia las notificaciones del usuario.
   */
  @Delete('insights')
  @HttpCode(HttpStatus.OK)
  clearInsights(@Request() req: any) {
    return this.automationService.clearInsights(req.user.id);
  }
}
