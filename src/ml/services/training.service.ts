import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import { DatasetService } from '../datasets/dataset.service';
import { saveModelToDir } from '../models/model-storage';
import { normalizeText } from '../pipelines/data-preparation.pipeline';
import {
  textToVector,
  categoryToOneHot,
  buildForecastFeatures,
} from '../pipelines/feature-engineering.pipeline';
import { CATEGORIES, ModelMetrics } from '../types/ml.types';
import { createClassifierModel } from '../models/expense-classifier.model';
import { createForecastModel } from '../models/expense-forecast.model';

/**
 * Training Service
 * Responsabilidad: entrenar modelos TF.js y persistirlos en disco.
 * Pipeline: Dataset → Features → Model.fit → Model.save
 */
@Injectable()
export class TrainingService {
  private readonly logger = new Logger(TrainingService.name);

  constructor(private readonly datasetService: DatasetService) {}

  async trainClassifier(): Promise<ModelMetrics> {
    const examples = await this.datasetService.getTrainingExamples();

    if (examples.length < 10) {
      throw new Error(
        `Datos insuficientes para entrenar: ${examples.length} muestras. Se necesitan al menos 10 gastos con categoría asignada.`,
      );
    }

    this.logger.log(`Training classifier with ${examples.length} examples...`);

    try {
      const tf = await import('@tensorflow/tfjs');

      // DATA → FEATURES
      const features = examples.map((e) =>
        textToVector(normalizeText(e.description)),
      );
      const labels = examples.map((e) =>
        categoryToOneHot(e.categoria, CATEGORIES),
      );

      const xs = tf.tensor2d(features);
      const ys = tf.tensor2d(labels);

      // MODEL
      const model = createClassifierModel(
        features[0].length,
        CATEGORIES.length,
      );

      const history = await model.fit(xs, ys, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            if (epoch % 10 === 0) {
              this.logger.log(
                `  Epoch ${epoch}: loss=${logs?.loss?.toFixed(4)}, acc=${logs?.acc?.toFixed(4)}`,
              );
            }
          },
        },
      });

      // SAVE
      const modelDir = path.join(process.cwd(), 'models', 'expense-classifier');
      await saveModelToDir(model, modelDir);
      this.logger.log(`Classifier saved to ${modelDir} ✓`);

      xs.dispose();
      ys.dispose();
      model.dispose();

      const acc = history.history.acc ?? history.history.accuracy ?? [0];
      const loss = history.history.loss ?? [0];

      return {
        accuracy: acc[acc.length - 1] as number,
        loss: loss[loss.length - 1] as number,
        trainedAt: new Date(),
        samplesUsed: examples.length,
      };
    } catch (err: any) {
      this.logger.error(`Training failed: ${err.message}`);
      throw new Error(`Training failed: ${err.message}`);
    }
  }

  async trainForecastModel(userId: string): Promise<ModelMetrics> {
    const now = new Date();
    const trainingInputs: number[][] = [];
    const trainingLabels: number[][] = [];

    // Recolectar datos de los últimos 6 meses
    for (let i = 1; i <= 6; i++) {
      let mes = now.getMonth() + 1 - i;
      let anio = now.getFullYear();
      if (mes <= 0) {
        mes += 12;
        anio -= 1;
      }

      const gastos = await this.datasetService.getGastosPorMes(
        userId,
        mes,
        anio,
      );
      const sueldo = await this.datasetService.getUltimoSueldo(userId);

      if (gastos.length === 0) continue;

      const totalGastos = gastos.reduce((a, b) => a + b.monto, 0);
      const income = sueldo?.monto ?? 0;

      const lastWeekGastos = gastos.filter((g) => {
        const diff = now.getTime() - g.fecha.getTime();
        return diff <= 7 * 24 * 60 * 60 * 1000;
      });
      const lastWeekAvg =
        lastWeekGastos.length > 0
          ? lastWeekGastos.reduce((a, b) => a + b.monto, 0) /
            lastWeekGastos.length
          : totalGastos / gastos.length;

      trainingInputs.push(
        buildForecastFeatures(15, lastWeekAvg, totalGastos, income),
      );
      trainingLabels.push([totalGastos / 100_000]);
    }

    if (trainingInputs.length < 3) {
      throw new Error(
        'Datos históricos insuficientes para forecast (mínimo 3 meses).',
      );
    }

    try {
      const tf = await import('@tensorflow/tfjs');

      const xs = tf.tensor2d(trainingInputs);
      const ys = tf.tensor2d(trainingLabels);
      const model = createForecastModel();

      await model.fit(xs, ys, { epochs: 100, batchSize: 4 });

      const modelDir = path.join(process.cwd(), 'models', 'expense-forecast');
      await saveModelToDir(model, modelDir);
      this.logger.log(`Forecast model saved to ${modelDir} ✓`);

      xs.dispose();
      ys.dispose();
      model.dispose();

      return {
        accuracy: 0,
        loss: 0,
        trainedAt: new Date(),
        samplesUsed: trainingInputs.length,
      };
    } catch (err: any) {
      this.logger.error(`Forecast training failed: ${err.message}`);
      throw new Error(`Forecast training failed: ${err.message}`);
    }
  }
}
