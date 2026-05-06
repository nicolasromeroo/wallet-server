import * as tf from '@tensorflow/tfjs';

/**
 * Modelo de predicción de gastos mensuales (forecast).
 * Arquitectura: Dense(16, relu) → Dense(8, relu) → Dense(1, linear)
 *
 * Features de entrada (4 dimensiones):
 *   [0] dayOfMonth / 31            → qué día del mes es (0–1)
 *   [1] lastWeekAverage / 100_000  → promedio diario última semana (normalizado)
 *   [2] categorySpend / 100_000    → gasto acumulado en la categoría (normalizado)
 *   [3] monthlyIncome / 1_000_000  → ingreso mensual (normalizado)
 *
 * Output: gasto proyectado normalizado (multiplicar × 100_000 para obtener valor real)
 */
export function createForecastModel(): tf.Sequential {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({ units: 16, inputShape: [4], activation: 'relu' }),
  );
  model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));

  model.compile({
    optimizer: 'adam',
    loss: 'meanSquaredError',
    metrics: ['mae'],
  });

  return model;
}
