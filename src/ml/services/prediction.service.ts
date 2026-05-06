import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import {
  CATEGORIES,
  ExpenseCategory,
  PredictionResult,
  ForecastResult,
} from '../types/ml.types';
import {
  textToVector,
  buildForecastFeatures,
} from '../pipelines/feature-engineering.pipeline';
import { normalizeText } from '../pipelines/data-preparation.pipeline';

/**
 * Prediction Service
 * Responsabilidad: cargar modelos guardados y ejecutar inferencia.
 * Usa dynamic import de TF para no crashear si el paquete no está instalado.
 * Fallback inteligente a reglas heurísticas cuando el modelo no existe.
 */
@Injectable()
export class PredictionService {
  private readonly logger = new Logger(PredictionService.name);
  private classifierModel: any = null;
  private forecastModel: any = null;

  private get classifierPath(): string {
    return path.join(
      process.cwd(),
      'models',
      'expense-classifier',
      'model.json',
    );
  }

  private get forecastPath(): string {
    return path.join(process.cwd(), 'models', 'expense-forecast', 'model.json');
  }

  async loadClassifier(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.classifierPath)) {
        this.logger.warn(
          'Classifier not found — train it first via POST /ml/train/classifier',
        );
        return false;
      }
      const tf = await import('@tensorflow/tfjs');
      this.classifierModel = await tf.loadLayersModel(
        `file://${this.classifierPath}`,
      );
      this.logger.log('Classifier model loaded ✓');
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to load classifier: ${err.message}`);
      return false;
    }
  }

  async loadForecastModel(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.forecastPath)) {
        this.logger.warn(
          'Forecast model not found — train it first via POST /ml/train/forecast',
        );
        return false;
      }
      const tf = await import('@tensorflow/tfjs');
      this.forecastModel = await tf.loadLayersModel(
        `file://${this.forecastPath}`,
      );
      this.logger.log('Forecast model loaded ✓');
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to load forecast model: ${err.message}`);
      return false;
    }
  }

  async predictCategory(description: string): Promise<PredictionResult> {
    if (!this.classifierModel) await this.loadClassifier();

    if (!this.classifierModel) {
      return this.ruleBasedClassification(description);
    }

    try {
      const tf = await import('@tensorflow/tfjs');
      const vector = textToVector(normalizeText(description));
      const input = tf.tensor2d([vector]);
      const output = this.classifierModel.predict(input) as any;
      const probs: Float32Array = await output.data();

      input.dispose();
      output.dispose();

      const maxIdx = Array.from(probs).indexOf(Math.max(...probs));
      const allProbabilities = {} as Record<ExpenseCategory, number>;
      CATEGORIES.forEach((cat, i) => {
        allProbabilities[cat] = probs[i];
      });

      return {
        categoria: CATEGORIES[maxIdx],
        confidence: probs[maxIdx],
        allProbabilities,
        source: 'model',
      };
    } catch (err: any) {
      this.logger.error(
        `Prediction error, using rule fallback: ${err.message}`,
      );
      return this.ruleBasedClassification(description);
    }
  }

  async predictForecast(
    dayOfMonth: number,
    lastWeekAverage: number,
    totalMonthSpend: number,
    monthlyIncome: number,
  ): Promise<ForecastResult> {
    const dailyBurnRate =
      totalMonthSpend > 0
        ? totalMonthSpend / Math.max(dayOfMonth, 1)
        : lastWeekAverage;

    if (!this.forecastModel) await this.loadForecastModel();

    if (!this.forecastModel) {
      return {
        predictedExpense: dailyBurnRate * 30,
        dailyBurnRate,
        confidence: 0.4,
      };
    }

    try {
      const tf = await import('@tensorflow/tfjs');
      const features = buildForecastFeatures(
        dayOfMonth,
        lastWeekAverage,
        totalMonthSpend,
        monthlyIncome,
      );
      const input = tf.tensor2d([features]);
      const output = this.forecastModel.predict(input) as any;
      const result: Float32Array = await output.data();

      input.dispose();
      output.dispose();

      return {
        predictedExpense: Math.max(0, result[0] * 100_000),
        dailyBurnRate,
        confidence: 0.75,
      };
    } catch (err: any) {
      this.logger.error(`Forecast error: ${err.message}`);
      return {
        predictedExpense: dailyBurnRate * 30,
        dailyBurnRate,
        confidence: 0.3,
      };
    }
  }

  // ─── Fallback: clasificación basada en reglas heurísticas ────────────────────
  private ruleBasedClassification(description: string): PredictionResult {
    const text = description.toLowerCase();

    const rules: Array<{ keywords: string[]; category: ExpenseCategory }> = [
      {
        keywords: [
          'mcdonald',
          'burger',
          'pizza',
          'comida',
          'restaurant',
          'cafe',
          'cafeteria',
          'uber eats',
          'pedidosya',
          'rappi',
          'almuerzo',
          'cena',
          'desayuno',
          'mercado',
          'supermercado',
          'carrefour',
          'walmart',
          'jumbo',
          'dia ',
          'panaderia',
          'verduleria',
        ],
        category: 'COMIDA',
      },
      {
        keywords: [
          'uber',
          'cabify',
          'taxi',
          'nafta',
          'combustible',
          'colectivo',
          'subte',
          'tren',
          'peaje',
          'estacionamiento',
          'shell',
          'ypf',
          'axion',
          'auto',
          'seguro auto',
        ],
        category: 'TRANSPORTE',
      },
      {
        keywords: [
          'netflix',
          'spotify',
          'cine',
          'teatro',
          'juego',
          'steam',
          'youtube premium',
          'disney',
          'amazon prime',
          'hbo',
          'paramount',
          'twitch',
          'playstation',
          'xbox',
        ],
        category: 'ENTRETENIMIENTO',
      },
      {
        keywords: [
          'farmacia',
          'medico',
          'doctor',
          'clinica',
          'hospital',
          'medicamento',
          'salud',
          'prepaga',
          'obra social',
          'pami',
          'osde',
          'swiss medical',
          'analisis',
        ],
        category: 'SALUD',
      },
      {
        keywords: [
          'libro',
          'curso',
          'universidad',
          'colegio',
          'instituto',
          'educacion',
          'udemy',
          'platzi',
          'coursera',
          'capacitacion',
          'seminario',
          'libreria',
        ],
        category: 'EDUCACION',
      },
      {
        keywords: [
          'alquiler',
          'expensas',
          'luz',
          'gas',
          'agua',
          'internet',
          'telefono',
          'limpieza',
          'hogar',
          'mueble',
          'edesur',
          'edenor',
          'metrogas',
          'telecom',
          'fibertel',
        ],
        category: 'HOGAR',
      },
      {
        keywords: [
          'apple',
          'samsung',
          'computadora',
          'celular',
          'laptop',
          'tablet',
          'electronico',
          'tecnologia',
          'software',
          'mercadolibre',
          'auricular',
          'monitor',
        ],
        category: 'TECNOLOGIA',
      },
    ];

    for (const rule of rules) {
      if (rule.keywords.some((k) => text.includes(k))) {
        const allProbs = {} as Record<ExpenseCategory, number>;
        CATEGORIES.forEach((c) => {
          allProbs[c] = c === rule.category ? 0.85 : 0.02;
        });
        return {
          categoria: rule.category,
          confidence: 0.85,
          allProbabilities: allProbs,
          source: 'rules',
        };
      }
    }

    const allProbs = {} as Record<ExpenseCategory, number>;
    CATEGORIES.forEach((c) => {
      allProbs[c] = c === 'OTROS' ? 0.5 : 0.07;
    });
    return {
      categoria: 'OTROS',
      confidence: 0.5,
      allProbabilities: allProbs,
      source: 'rules',
    };
  }
}
