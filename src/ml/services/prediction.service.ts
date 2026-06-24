import { Injectable, Logger } from '@nestjs/common';
import * as path from 'path';
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
import { loadModelFromDir } from '../models/model-storage';

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

  // Debajo de esta confianza, el modelo cede ante las reglas de palabras clave.
  private readonly MODEL_CONFIDENCE_FLOOR = 0.5;

  private get classifierDir(): string {
    return path.join(process.cwd(), 'models', 'expense-classifier');
  }

  private get forecastDir(): string {
    return path.join(process.cwd(), 'models', 'expense-forecast');
  }

  async loadClassifier(): Promise<boolean> {
    try {
      const model = await loadModelFromDir(this.classifierDir);
      if (!model) {
        this.logger.warn(
          'Classifier not found — train it first via POST /ml/train/classifier',
        );
        return false;
      }
      this.classifierModel = model;
      this.logger.log('Classifier model loaded ✓');
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to load classifier: ${err.message}`);
      return false;
    }
  }

  async loadForecastModel(): Promise<boolean> {
    try {
      const model = await loadModelFromDir(this.forecastDir);
      if (!model) {
        this.logger.warn(
          'Forecast model not found — train it first via POST /ml/train/forecast',
        );
        return false;
      }
      this.forecastModel = model;
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

      // Guard: si el modelo guardado tiene otra cantidad de clases que la
      // taxonomía actual (p.ej. se agregaron categorías y no se reentrenó),
      // cae a reglas en lugar de devolver probabilidades desalineadas.
      if (probs.length !== CATEGORIES.length) {
        this.logger.warn(
          `Modelo desactualizado (${probs.length} clases vs ${CATEGORIES.length}). Reentrená el clasificador. Uso reglas.`,
        );
        return this.ruleBasedClassification(description);
      }

      const maxIdx = Array.from(probs).indexOf(Math.max(...probs));
      const allProbabilities = {} as Record<ExpenseCategory, number>;
      CATEGORIES.forEach((cat, i) => {
        allProbabilities[cat] = probs[i];
      });
      const confidence = probs[maxIdx];

      // Híbrido: un modelo recién entrenado con pocos datos reparte la
      // probabilidad entre muchas clases y queda con confianza baja. Si el
      // modelo no está seguro pero las reglas reconocen palabras clave, ganan
      // las reglas (señal fuerte y explicable). El modelo solo prevalece cuando
      // está realmente seguro.
      if (confidence < this.MODEL_CONFIDENCE_FLOOR) {
        const rule = this.ruleBasedClassification(description);
        if (rule.categoria !== 'OTROS') return rule;
      }

      return {
        categoria: CATEGORIES[maxIdx],
        confidence,
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
          'panaderia',
          'parrilla',
          'sushi',
          'bar ',
        ],
        category: 'COMIDA',
      },
      {
        keywords: [
          'mercado',
          'supermercado',
          'carrefour',
          'walmart',
          'jumbo',
          'coto',
          'dia ',
          'almacen',
          'verduleria',
          'fruteria',
          'carniceria',
          'kiosco',
          'despensa',
          'chino',
        ],
        category: 'ALMACEN',
      },
      {
        keywords: [
          'uber',
          'cabify',
          'taxi',
          'didi',
          'remis',
          'nafta',
          'combustible',
          'peaje',
          'estacionamiento',
          'shell',
          'ypf',
          'axion',
        ],
        category: 'UBER',
      },
      {
        keywords: [
          'colectivo',
          'subte',
          'tren',
          'sube',
          'micro',
          'bondi',
          'boleto',
        ],
        category: 'COLECTIVO',
      },
      {
        keywords: [
          'cine',
          'teatro',
          'juego',
          'steam',
          'playstation',
          'xbox',
          'recital',
          'boliche',
          'salida',
          'parque',
        ],
        category: 'ENTRETENIMIENTO',
      },
      {
        keywords: [
          'netflix',
          'spotify',
          'disney',
          'amazon prime',
          'youtube premium',
          'hbo',
          'max',
          'paramount',
          'twitch',
          'suscripcion',
          'membresia',
          'plan mensual',
        ],
        category: 'SUSCRIPCIONES',
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
          'dentista',
          'analisis',
        ],
        category: 'SALUD',
      },
      {
        keywords: [
          'veterinaria',
          'veterinario',
          'mascota',
          'perro',
          'gato',
          'balanceado',
          'petshop',
          'pet shop',
          'alimento para',
        ],
        category: 'MASCOTAS',
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
          'apuntes',
        ],
        category: 'EDUCACION',
      },
      {
        keywords: [
          'alquiler',
          'expensas',
          'limpieza',
          'hogar',
          'mueble',
          'ferreteria',
          'decoracion',
          'electrodomestico',
          'sommier',
          'colchon',
        ],
        category: 'HOGAR',
      },
      {
        keywords: [
          'luz',
          'gas',
          'agua',
          'internet',
          'telefono',
          'celular plan',
          'edesur',
          'edenor',
          'metrogas',
          'aysa',
          'telecom',
          'fibertel',
          'movistar',
          'claro',
          'personal',
          'cable',
        ],
        category: 'SERVICIOS',
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
          'teclado',
          'mouse',
        ],
        category: 'TECNOLOGIA',
      },
      {
        keywords: [
          'ropa',
          'zapatilla',
          'zapato',
          'remera',
          'pantalon',
          'campera',
          'indumentaria',
          'nike',
          'adidas',
          'zara',
          'vestido',
          'calzado',
          'jean',
        ],
        category: 'ROPA',
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
