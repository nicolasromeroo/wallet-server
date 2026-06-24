import { Injectable, Logger } from '@nestjs/common';
import { DatasetService } from '../datasets/dataset.service';
import {
  AnomalyResult,
  AnomalyScanResult,
  AnomalyLevel,
  AnomalyKind,
  CATEGORIES,
  ExpectedRange,
  ModelMetrics,
} from '../types/ml.types';
import {
  buildAnomalyFeatures,
  median,
  medianAbsoluteDeviation,
  robustZScore,
} from '../pipelines/feature-engineering.pipeline';
import { normalizeText } from '../pipelines/data-preparation.pipeline';
import {
  createAnomalyModel,
  reconstructionErrors,
} from '../models/anomaly-detector.model';
import { saveModelToDir, loadModelFromDir } from '../models/model-storage';

interface Gasto {
  id: string;
  descripcion: string;
  monto: number;
  fecha: Date;
  categoria: string | null;
}

/** Estadística robusta por categoría (la base de toda la explicación). */
interface CategoryStats extends ExpectedRange {
  mad: number;
}

const Z_ANOMALY = 3.5; // umbral clásico de outlier sobre z-score robusto
const MIN_GASTOS_TO_SCAN = 5;
const MIN_GASTOS_TO_TRAIN = 15;
const DEFAULT_WINDOW_DAYS = 180;
const MAX_ANOMALIES = 15;

/**
 * Anomaly Service — detección de gastos inusuales.
 *
 * Tiene DOS motores, en línea con el patrón "modelo + fallback" del resto del
 * módulo ML:
 *
 *   1. Estadística robusta (mediana + MAD por categoría) — SIEMPRE disponible,
 *      100% explicable, funciona desde pocos gastos. Es el motor por defecto.
 *   2. Autoencoder TF.js — "mejora" opcional que aprende el patrón global de
 *      gastos. Se mantiene en memoria tras entrenar (así funciona aunque no
 *      esté instalado @tensorflow/tfjs-node para persistir en disco).
 *
 * En ambos casos la EXPLICACIÓN ("tu gasto típico en X ronda $Y") sale siempre
 * de la estadística: el modelo decide el grado de rareza, la estadística lo
 * traduce a algo entendible.
 */
@Injectable()
export class AnomalyService {
  private readonly logger = new Logger(AnomalyService.name);

  // Modelo entrenado en memoria (se pierde al reiniciar el proceso; ver doc).
  private model: any = null;
  private threshold = 0; // media + 3·desvío de los errores de reconstrucción
  private errorMean = 0; // media de errores (para normalizar el score)
  private inputDim = 0;

  constructor(private readonly datasetService: DatasetService) {}

  // ─── Escaneo principal ─────────────────────────────────────────────────────
  async detectAnomalies(
    userId: string,
    windowDays = DEFAULT_WINDOW_DAYS,
  ): Promise<AnomalyScanResult> {
    const all = (await this.datasetService.getGastos(userId)) as Gasto[];
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const gastos = all.filter((g) => g.fecha.getTime() >= cutoff);

    const baseline = this.buildBaseline(gastos);
    const baselinePublic: Record<string, ExpectedRange> = {};
    for (const [cat, s] of Object.entries(baseline)) {
      baselinePublic[cat] = {
        typical: s.typical,
        min: s.min,
        max: s.max,
        count: s.count,
      };
    }

    if (gastos.length < MIN_GASTOS_TO_SCAN) {
      return {
        anomalies: [],
        scanned: gastos.length,
        windowDays,
        source: 'stats',
        baseline: baselinePublic,
        message: `Necesitás al menos ${MIN_GASTOS_TO_SCAN} gastos en los últimos ${windowDays} días para detectar patrones. Llevás ${gastos.length}.`,
      };
    }

    // Stats globales como respaldo para categorías con pocos datos.
    const globalStats = this.statsFor(gastos.map((g) => g.monto));

    const statsFor = (cat: string) =>
      baseline[cat] && baseline[cat].count >= 4 ? baseline[cat] : globalStats;

    const anomalies: AnomalyResult[] = [];
    const seen = new Set<string>();

    // ── Pasada 1: MONTO atípico (estadística, siempre disponible) ────────────
    for (const g of gastos) {
      const cat = this.normCat(g.categoria);
      const stats = statsFor(cat);
      const z = robustZScore(g.monto, stats.typical, stats.mad);
      const isHigh = g.monto > stats.typical;
      if (z >= Z_ANOMALY && isHigh) {
        const score = Math.min(0.99, z / 9);
        anomalies.push(
          this.buildResult(g, cat, stats, score, 'monto', 'stats'),
        );
        seen.add(g.id);
      }
    }

    // ── Pasada 2: PATRÓN inusual (autoencoder) — solo SUMA, no reemplaza ──────
    const modelScores = await this.tryModelScores(gastos);
    if (modelScores) {
      for (const g of gastos) {
        if (seen.has(g.id)) continue; // ya marcado por monto
        const err = modelScores.get(g.id) ?? 0;
        const cat = this.normCat(g.categoria);
        const stats = statsFor(cat);
        // El error debe superar el umbral aprendido y el gasto no ser trivial.
        if (err > this.threshold && g.monto >= stats.typical * 0.8) {
          const denom = this.threshold - this.errorMean || this.threshold || 1;
          const score = Math.min(0.99, 0.6 + (err - this.threshold) / (denom * 4));
          anomalies.push(
            this.buildResult(g, cat, stats, score, 'patron', 'model'),
          );
          seen.add(g.id);
        }
      }
    }

    // ── Pasada 3: FRECUENCIA (misma compra repetida en pocos días) ───────────
    anomalies.push(...this.detectFrequency(gastos, windowDays, statsFor));

    anomalies.sort((a, b) => b.score - a.score);

    return {
      anomalies: anomalies.slice(0, MAX_ANOMALIES),
      scanned: gastos.length,
      windowDays,
      source: modelScores ? 'model' : 'stats',
      baseline: baselinePublic,
    };
  }

  /**
   * Detección por frecuencia: agrupa por descripción normalizada y marca las
   * compras que aparecen muchas veces en los últimos 7 días respecto a lo
   * habitual en la ventana. No es por monto: es por repetición.
   */
  private detectFrequency(
    gastos: Gasto[],
    windowDays: number,
    statsFor: (cat: string) => CategoryStats,
  ): AnomalyResult[] {
    const weeks = Math.max(windowDays / 7, 1);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const groups = new Map<string, Gasto[]>();
    for (const g of gastos) {
      const key = normalizeText(g.descripcion) || '(sin descripción)';
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(g);
    }

    const out: AnomalyResult[] = [];
    for (const list of groups.values()) {
      if (list.length < 3) continue; // sin algo de historial no hay "habitual"
      const last7 = list.filter((g) => g.fecha.getTime() >= sevenDaysAgo);
      if (last7.length < 3) continue;

      const weeklyAvg = list.length / weeks;
      const ratio = last7.length / Math.max(weeklyAvg, 1);
      if (ratio < 2) continue; // al menos el doble de lo habitual

      const rep = last7.reduce((a, b) => (a.fecha > b.fecha ? a : b));
      const cat = this.normCat(rep.categoria);
      const total = last7.reduce((a, b) => a + b.monto, 0);
      const score = Math.min(0.99, 0.5 + (ratio - 2) / 6);

      out.push({
        gastoId: `freq:${normalizeText(rep.descripcion)}`,
        descripcion: rep.descripcion,
        monto: total,
        categoria: cat,
        fecha: rep.fecha.toISOString(),
        score,
        level: ratio >= 3 ? 'muy_inusual' : 'inusual',
        kind: 'frecuencia',
        isAnomaly: true,
        reason: `Compraste en "${rep.descripcion}" ${last7.length} veces en los últimos 7 días ($${this.fmt(total)} en total) — más seguido que lo habitual.`,
        expected: this.toRange(statsFor(cat)),
        occurrences: last7.length,
        source: 'stats',
      });
    }
    return out;
  }

  // ─── Entrenamiento del autoencoder ──────────────────────────────────────────
  async trainAnomalyModel(
    userId: string,
    windowDays = 365,
  ): Promise<ModelMetrics & { threshold: number }> {
    const all = (await this.datasetService.getGastos(userId)) as Gasto[];
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const gastos = all.filter((g) => g.fecha.getTime() >= cutoff);

    if (gastos.length < MIN_GASTOS_TO_TRAIN) {
      throw new Error(
        `Datos insuficientes para entrenar el detector: ${gastos.length} gastos. Se necesitan al menos ${MIN_GASTOS_TO_TRAIN}.`,
      );
    }

    const tf = await import('@tensorflow/tfjs');

    const features = gastos.map((g) =>
      buildAnomalyFeatures(
        g.monto,
        this.normCat(g.categoria),
        g.fecha,
        CATEGORIES as string[],
      ),
    );
    this.inputDim = features[0].length;

    const xs = tf.tensor2d(features);
    const model = createAnomalyModel(this.inputDim);

    // Autoencoder: la entrada ES el objetivo (aprende a reconstruirse).
    const history = await model.fit(xs, xs, {
      epochs: 80,
      batchSize: 16,
      shuffle: true,
      verbose: 0,
    });

    // Umbral = media + 3·desvío de los errores de reconstrucción.
    // (Antes usábamos percentil 92, que marcaba SIEMPRE el ~8% como anómalo;
    //  con media+3σ un mes normal puede dar cero anomalías de patrón.)
    const recon = model.predict(xs) as any;
    const errors = reconstructionErrors(xs, recon);
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
    const variance =
      errors.reduce((a, b) => a + (b - mean) ** 2, 0) / errors.length;
    const std = Math.sqrt(variance);
    const threshold = mean + 3 * std;

    xs.dispose();
    recon.dispose();

    this.model = model;
    this.errorMean = mean;
    this.threshold = threshold;

    // Persistencia best-effort (requiere @tensorflow/tfjs-node; si no, queda en memoria).
    await this.trySaveModel(model);

    const lossHist = (history.history.loss ?? [0]) as number[];
    this.logger.log(
      `Anomaly model entrenado con ${gastos.length} gastos. Umbral=${threshold.toFixed(5)} (media=${mean.toFixed(5)})`,
    );

    return {
      accuracy: 0,
      loss: lossHist[lossHist.length - 1],
      trainedAt: new Date(),
      samplesUsed: gastos.length,
      threshold,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  /** Calcula la estadística robusta de cada categoría a partir de los gastos. */
  private buildBaseline(gastos: Gasto[]): Record<string, CategoryStats> {
    const byCat: Record<string, number[]> = {};
    for (const g of gastos) {
      const cat = this.normCat(g.categoria);
      (byCat[cat] ??= []).push(g.monto);
    }
    const out: Record<string, CategoryStats> = {};
    for (const [cat, montos] of Object.entries(byCat)) {
      out[cat] = this.statsFor(montos);
    }
    return out;
  }

  private statsFor(montos: number[]): CategoryStats {
    const med = median(montos);
    let mad = medianAbsoluteDeviation(montos, med);
    // Si todos los valores son casi iguales, MAD≈0: usamos un piso razonable
    // para no dividir por cero ni marcar todo como anómalo.
    if (mad <= 0) mad = Math.max(med * 0.2, 1);
    return {
      typical: med,
      mad,
      min: montos.length ? Math.min(...montos) : 0,
      max: montos.length ? Math.max(...montos) : 0,
      count: montos.length,
    };
  }

  private buildResult(
    g: Gasto,
    cat: string,
    stats: CategoryStats,
    score: number,
    kind: AnomalyKind,
    source: 'model' | 'stats',
  ): AnomalyResult {
    const level: AnomalyLevel = score >= 0.7 ? 'muy_inusual' : 'inusual';
    const ratio = stats.typical > 0 ? g.monto / stats.typical : 0;
    const catLabel = this.label(cat);

    let reason: string;
    if (kind === 'patron') {
      reason = `Por monto no es extremo, pero la combinación de categoría, monto y fecha es poco habitual en tu historial. Lo detectó la red neuronal.`;
    } else if (ratio >= 1.2) {
      reason = `Tu gasto típico en ${catLabel} ronda $${this.fmt(stats.typical)}. Este de $${this.fmt(g.monto)} es ${ratio.toFixed(1)}× mayor.`;
    } else {
      reason = `Este gasto de $${this.fmt(g.monto)} se aparta del patrón habitual de ${catLabel} (típico ~$${this.fmt(stats.typical)}).`;
    }

    return {
      gastoId: g.id,
      descripcion: g.descripcion,
      monto: g.monto,
      categoria: cat,
      fecha: g.fecha.toISOString(),
      score,
      level,
      kind,
      isAnomaly: true,
      reason,
      expected: this.toRange(stats),
      source,
    };
  }

  private toRange(stats: CategoryStats): ExpectedRange {
    return {
      typical: stats.typical,
      min: stats.min,
      max: stats.max,
      count: stats.count,
    };
  }

  /** Devuelve un map gastoId→error de reconstrucción, o null si no hay modelo. */
  private async tryModelScores(
    gastos: Gasto[],
  ): Promise<Map<string, number> | null> {
    if (!this.model) await this.loadFromDiskIfNeeded();
    if (!this.model || this.inputDim === 0) return null;
    try {
      const tf = await import('@tensorflow/tfjs');
      const feats = gastos.map((g) =>
        buildAnomalyFeatures(
          g.monto,
          this.normCat(g.categoria),
          g.fecha,
          CATEGORIES as string[],
        ),
      );
      const xs = tf.tensor2d(feats);
      const recon = this.model.predict(xs) as any;
      const errs = reconstructionErrors(xs, recon);
      xs.dispose();
      recon.dispose();
      const map = new Map<string, number>();
      gastos.forEach((g, i) => map.set(g.id, errs[i]));
      return map;
    } catch (err: any) {
      this.logger.warn(`Modelo de anomalías no usable, uso estadística: ${err.message}`);
      return null;
    }
  }

  private async trySaveModel(model: any): Promise<void> {
    try {
      const path = await import('path');
      const fs = await import('fs');
      const dir = path.join(process.cwd(), 'models', 'anomaly-detector');
      await saveModelToDir(model, dir);
      fs.writeFileSync(
        path.join(dir, 'meta.json'),
        JSON.stringify({
          threshold: this.threshold,
          errorMean: this.errorMean,
          inputDim: this.inputDim,
        }),
      );
      this.logger.log('Anomaly model persistido en disco ✓');
    } catch (err: any) {
      this.logger.warn(
        `No se pudo persistir el modelo: ${err.message}. Queda en memoria.`,
      );
    }
  }

  /** Carga el autoencoder y su metadata desde disco si todavía no está en memoria. */
  private async loadFromDiskIfNeeded(): Promise<void> {
    try {
      const path = await import('path');
      const fs = await import('fs');
      const dir = path.join(process.cwd(), 'models', 'anomaly-detector');
      const model = await loadModelFromDir(dir);
      if (!model) return;
      this.model = model;
      const metaPath = path.join(dir, 'meta.json');
      if (fs.existsSync(metaPath)) {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
        this.threshold = meta.threshold ?? 0;
        this.errorMean = meta.errorMean ?? 0;
        this.inputDim = meta.inputDim ?? 0;
      }
      this.logger.log('Anomaly model cargado desde disco ✓');
    } catch (err: any) {
      this.logger.warn(`No se pudo cargar el modelo de anomalías: ${err.message}`);
    }
  }

  private normCat(categoria: string | null): string {
    const c = (categoria ?? 'OTROS').toUpperCase();
    return (CATEGORIES as string[]).includes(c) ? c : 'OTROS';
  }

  private label(cat: string): string {
    return cat.charAt(0) + cat.slice(1).toLowerCase();
  }

  private fmt(n: number): string {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
  }
}
