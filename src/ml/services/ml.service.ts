import { Injectable } from '@nestjs/common';
import { PredictionService } from './prediction.service';
import { TrainingService } from './training.service';
import { AnomalyService } from './anomaly.service';
import { DatasetService } from '../datasets/dataset.service';
import {
  PredictionResult,
  ForecastResult,
  ModelMetrics,
  AnomalyScanResult,
  AnomalyResult,
} from '../types/ml.types';

/**
 * ML Service — orquestador principal del módulo ML
 * Responsabilidad: coordinar predicción, entrenamiento y acceso al dataset.
 * Los controllers y handlers solo interactúan con esta capa.
 */
@Injectable()
export class MlService {
  constructor(
    private readonly predictionService: PredictionService,
    private readonly trainingService: TrainingService,
    private readonly anomalyService: AnomalyService,
    private readonly datasetService: DatasetService,
  ) {}

  /** Clasifica una descripción de gasto y devuelve categoría + probabilidades */
  async classifyExpense(description: string): Promise<PredictionResult> {
    return this.predictionService.predictCategory(description);
  }

  /** Predice el gasto total del mes actual para un usuario */
  async forecastExpenses(userId: string): Promise<ForecastResult> {
    const now = new Date();
    const mes = now.getMonth() + 1;
    const anio = now.getFullYear();

    const [gastos, sueldo] = await Promise.all([
      this.datasetService.getGastosPorMes(userId, mes, anio),
      this.datasetService.getUltimoSueldo(userId),
    ]);

    const totalGastos = gastos.reduce((a, b) => a + b.monto, 0);
    const lastWeekGastos = gastos.filter((g) => {
      const diff = now.getTime() - g.fecha.getTime();
      return diff <= 7 * 24 * 60 * 60 * 1000;
    });
    const lastWeekAvg =
      lastWeekGastos.length > 0
        ? lastWeekGastos.reduce((a, b) => a + b.monto, 0) /
          lastWeekGastos.length
        : totalGastos / Math.max(gastos.length, 1);

    return this.predictionService.predictForecast(
      now.getDate(),
      lastWeekAvg,
      totalGastos,
      sueldo?.monto ?? 0,
    );
  }

  /** Entrena el clasificador de categorías con los gastos etiquetados en DB */
  async trainClassifier(): Promise<ModelMetrics> {
    return this.trainingService.trainClassifier();
  }

  /** Entrena el modelo de forecast con el historial del usuario */
  async trainForecast(userId: string): Promise<ModelMetrics> {
    return this.trainingService.trainForecastModel(userId);
  }

  /** Escanea los gastos recientes del usuario en busca de montos inusuales */
  async detectAnomalies(userId: string): Promise<AnomalyScanResult> {
    return this.anomalyService.detectAnomalies(userId);
  }

  /**
   * Evalúa un gasto puntual recién creado: corre el escaneo y devuelve la
   * anomalía correspondiente a ese gastoId, o null si no resultó inusual.
   * Lo usa AutomationService para avisar en el momento de la carga.
   */
  async checkGastoAnomaly(
    userId: string,
    gastoId: string,
  ): Promise<AnomalyResult | null> {
    const scan = await this.anomalyService.detectAnomalies(userId);
    return scan.anomalies.find((a) => a.gastoId === gastoId) ?? null;
  }

  /** Entrena el autoencoder de anomalías con el historial del usuario */
  async trainAnomalyDetector(userId: string): Promise<ModelMetrics> {
    return this.anomalyService.trainAnomalyModel(userId);
  }
}
