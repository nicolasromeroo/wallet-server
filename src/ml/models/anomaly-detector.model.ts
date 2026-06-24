import * as tf from '@tensorflow/tfjs';

/**
 * Autoencoder para detección de gastos inusuales (anomalías).
 *
 * IDEA CLAVE — ¿cómo detecta una red neuronal algo "inusual" sin etiquetas?
 *
 *   1. Un autoencoder es una red con forma de reloj de arena: comprime la
 *      entrada a un "cuello de botella" (pocas neuronas) y luego intenta
 *      reconstruirla idéntica a la salida.
 *
 *      entrada(11) → [8] → [3 = código comprimido] → [8] → salida(11)
 *
 *   2. Al entrenar SOLO con tus gastos normales, la red aprende a reconstruir
 *      bien lo típico. Como el cuello de botella la obliga a quedarse con los
 *      patrones más frecuentes, NO aprende a reconstruir lo raro.
 *
 *   3. En inferencia medimos el ERROR DE RECONSTRUCCIÓN (qué tan distinta es la
 *      salida de la entrada). Gasto normal → error bajo. Gasto atípico → error
 *      alto, porque la red nunca "vio" algo así y no sabe reconstruirlo.
 *
 * Esto es aprendizaje NO supervisado: no necesitás decirle qué es una anomalía,
 * la red lo infiere de lo que es "normal" para vos.
 */
export function createAnomalyModel(inputDim: number): tf.LayersModel {
  const input = tf.input({ shape: [inputDim] });

  // Encoder: comprime hacia el cuello de botella
  const enc1 = tf.layers
    .dense({ units: 8, activation: 'relu' })
    .apply(input) as tf.SymbolicTensor;
  const bottleneck = tf.layers
    .dense({ units: 3, activation: 'relu' })
    .apply(enc1) as tf.SymbolicTensor;

  // Decoder: reconstruye desde el código comprimido
  const dec1 = tf.layers
    .dense({ units: 8, activation: 'relu' })
    .apply(bottleneck) as tf.SymbolicTensor;
  // sigmoid: las features están normalizadas a [0, 1]
  const output = tf.layers
    .dense({ units: inputDim, activation: 'sigmoid' })
    .apply(dec1) as tf.SymbolicTensor;

  const model = tf.model({ inputs: input, outputs: output });

  model.compile({
    optimizer: tf.train.adam(0.01),
    loss: 'meanSquaredError',
  });

  return model;
}

/**
 * Error de reconstrucción por muestra (MSE entre entrada y salida reconstruida).
 * Es el "score" crudo de anomalía: cuanto más alto, más raro es el gasto.
 */
export function reconstructionErrors(
  original: tf.Tensor2D,
  reconstructed: tf.Tensor2D,
): number[] {
  return tf.tidy(() => {
    const diff = original.sub(reconstructed);
    const mse = diff.square().mean(1); // promedio por fila
    return Array.from(mse.dataSync());
  });
}
