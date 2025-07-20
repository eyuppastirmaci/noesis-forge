import { pipeline } from '@xenova/transformers';

const models = [
  { task: 'feature-extraction', model: 'Xenova/bge-m3' },
  { task: 'image-feature-extraction', model: 'Xenova/siglip-base-patch16-224' }
];

async function downloadModels() {
  for (const { task, model } of models) {
    console.log(`Downloading ${model}...`);
    try {
      await pipeline(task, model, {
        quantized: true,
        cache_dir: './models',
        progress_callback: (progress) => {
          if (progress.status === 'progress' && progress.progress) {
            process.stdout.write(`\r${model}: ${Math.round(progress.progress)}%`);
          }
        }
      });
      console.log(`\n✓ ${model} downloaded`);
    } catch (error) {
      console.error(`\n✗ Error downloading ${model}:`, error.message);
    }
  }
}

downloadModels();