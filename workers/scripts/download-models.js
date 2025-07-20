import { pipeline } from "@huggingface/transformers";
import logger from "../src/utils/logger.js";

const modelsToDownload = [
  {
    task: "feature-extraction",
    model: "Xenova/bge-m3",
  },
  {
    task: "image-feature-extraction",
    model: "Xenova/siglip-base-patch16-224",
  },
];

async function downloadAllModels() {
  logger.info("Starting model download process");
  const modelsCachePath = "./models";

  for (const { task, model } of modelsToDownload) {
    logger.info({ model, task }, "Downloading model");

    try {
      await pipeline(task, model, {
        quantized: true,
        cache_dir: modelsCachePath,
        progress_callback: (progress) => {
          if (progress.status === "progress" && progress.progress) {
            const percentage = Math.round(progress.progress);
            // Log only at 25%, 50%, 75% milestones to avoid spam
            if (percentage % 25 === 0) {
              logger.debug({ model, percentage }, "Download progress");
            }
          } else if (progress.status === "done") {
            logger.info({ model }, "Download completed, finalizing");
          }
        },
      });

      logger.info({ model }, "Model downloaded successfully");
    } catch (error) {
      logger.error({ model, error: error.message }, "Failed to download model");
    }
  }

  logger.info("All model download tasks completed");
}

downloadAllModels();
