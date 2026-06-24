import * as path from 'path';
import * as fs from 'fs';

/**
 * Persistencia de modelos TF.js a disco SIN @tensorflow/tfjs-node.
 *
 * El paquete puro `@tensorflow/tfjs` no registra el scheme `file://`
 * (eso lo agrega tfjs-node, que requiere compilación nativa). Pero tfjs sí
 * expone la API de IOHandlers, así que implementamos el guardado/carga a mano:
 *
 *   model.json   → topología + manifiesto de pesos
 *   weights.bin  → pesos binarios
 *
 * Funciona en cualquier OS sin dependencias nativas.
 */

export async function saveModelToDir(model: any, dir: string): Promise<void> {
  const tf = await import('@tensorflow/tfjs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const handler = tf.io.withSaveHandler(async (artifacts: any) => {
    const modelJson = {
      modelTopology: artifacts.modelTopology,
      format: artifacts.format,
      generatedBy: artifacts.generatedBy,
      convertedBy: artifacts.convertedBy,
      weightsManifest: [
        { paths: ['weights.bin'], weights: artifacts.weightSpecs },
      ],
    };
    fs.writeFileSync(path.join(dir, 'model.json'), JSON.stringify(modelJson));
    fs.writeFileSync(
      path.join(dir, 'weights.bin'),
      Buffer.from(artifacts.weightData as ArrayBuffer),
    );
    return {
      modelArtifactsInfo: {
        dateSaved: new Date(),
        modelTopologyType: 'JSON' as const,
      },
    };
  });

  await model.save(handler);
}

/** Carga un modelo guardado con saveModelToDir. Devuelve null si no existe. */
export async function loadModelFromDir(dir: string): Promise<any | null> {
  const modelJsonPath = path.join(dir, 'model.json');
  const weightsPath = path.join(dir, 'weights.bin');
  if (!fs.existsSync(modelJsonPath) || !fs.existsSync(weightsPath)) return null;

  const tf = await import('@tensorflow/tfjs');
  const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf-8'));
  const weightBuffer = fs.readFileSync(weightsPath);
  const weightData = weightBuffer.buffer.slice(
    weightBuffer.byteOffset,
    weightBuffer.byteOffset + weightBuffer.byteLength,
  );

  const handler = tf.io.fromMemory({
    modelTopology: modelJson.modelTopology,
    weightSpecs: modelJson.weightsManifest[0].weights,
    weightData,
  });

  return tf.loadLayersModel(handler);
}
