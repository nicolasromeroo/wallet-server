import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TrainingService } from '../services/training.service';

/**
 * Training Job — cron diario para reentrenamiento automático del clasificador.
 * Se ejecuta cada día a medianoche.
 * Si no hay suficientes datos, loguea y continúa sin romper la app.
 *
 * Pipeline automático:
 *   DB Gastos etiquetados → TrainingService.trainClassifier() → models/expense-classifier/
 */
@Injectable()
export class TrainingJob {
  private readonly logger = new Logger(TrainingJob.name);

  constructor(private readonly trainingService: TrainingService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyClassifierRetraining() {
    this.logger.log('[CRON] Starting daily classifier retraining...');
    try {
      const metrics = await this.trainingService.trainClassifier();
      this.logger.log(
        `[CRON] Retraining complete — Accuracy: ${(metrics.accuracy * 100).toFixed(2)}% | Loss: ${metrics.loss.toFixed(4)} | Samples: ${metrics.samplesUsed}`,
      );
    } catch (err: any) {
      this.logger.warn(`[CRON] Retraining skipped: ${err.message}`);
    }
  }
}
