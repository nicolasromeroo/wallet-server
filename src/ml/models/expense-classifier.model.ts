import * as tf from '@tensorflow/tfjs';

/**
 * Modelo de clasificación de gastos por categoría.
 * Arquitectura: Dense(64, relu) → Dropout(0.3) → Dense(32, relu) → Dropout(0.2) → Dense(outputSize, softmax)
 * Input: vector de texto normalizado (MAX_DESCRIPTION_LENGTH * charCode/255)
 * Output: probabilidades por categoría (softmax)
 */
export function createClassifierModel(
  inputSize: number,
  outputSize: number,
): tf.Sequential {
  const model = tf.sequential();

  model.add(
    tf.layers.dense({
      units: 64,
      inputShape: [inputSize],
      activation: 'relu',
      kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }),
    }),
  );
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: outputSize, activation: 'softmax' }));

  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy'],
  });

  return model;
}
