import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { MlService } from './services/ml.service';

@UseGuards(JwtGuard)
@Controller('ml')
export class MlController {
  constructor(private readonly mlService: MlService) {}

  /**
   * POST /ml/classify
   * Clasifica una descripción de gasto en una categoría.
   * Body: { "description": "McDonald's" }
   * Response: { categoria, confidence, allProbabilities, source }
   */
  @Post('classify')
  @HttpCode(HttpStatus.OK)
  classifyExpense(@Body('description') description: string) {
    return this.mlService.classifyExpense(description ?? '');
  }

  /**
   * GET /ml/forecast
   * Predice el gasto total del mes actual para el usuario autenticado.
   * Response: { predictedExpense, dailyBurnRate, confidence }
   */
  @Get('forecast')
  forecastExpenses(@Request() req: any) {
    return this.mlService.forecastExpenses(req.user.id);
  }

  /**
   * POST /ml/train/classifier
   * Entrena el clasificador con todos los gastos etiquetados en DB.
   * Requiere al menos 10 gastos con campo `categoria` asignado.
   */
  @Post('train/classifier')
  @HttpCode(HttpStatus.OK)
  trainClassifier() {
    return this.mlService.trainClassifier();
  }

  /**
   * POST /ml/train/forecast
   * Entrena el modelo de forecast con el historial del usuario autenticado.
   * Requiere al menos 3 meses de historial.
   */
  @Post('train/forecast')
  @HttpCode(HttpStatus.OK)
  trainForecast(@Request() req: any) {
    return this.mlService.trainForecast(req.user.id);
  }

  /**
   * GET /ml/anomalies
   * Escanea los gastos recientes del usuario y devuelve los montos inusuales,
   * con su explicación y el rango esperado por categoría.
   */
  @Get('anomalies')
  detectAnomalies(@Request() req: any) {
    return this.mlService.detectAnomalies(req.user.id);
  }

  /**
   * POST /ml/train/anomaly
   * Entrena el autoencoder de detección de anomalías con el historial del usuario.
   * Requiere al menos 15 gastos. El detector funciona igual sin entrenar
   * (cae a estadística robusta), esto solo lo mejora.
   */
  @Post('train/anomaly')
  @HttpCode(HttpStatus.OK)
  trainAnomaly(@Request() req: any) {
    return this.mlService.trainAnomalyDetector(req.user.id);
  }
}
