import { pipeline } from "@huggingface/transformers";
import logger from "../logging/logger.js";
import fs from "fs/promises";
import path from "path";

export class ModelManager {
  constructor() {
    this.modelsPath = process.env.MODELS_PATH || "/app/models";
    this.loadedModels = new Map();
    this.loadingPromises = new Map();
    this.maxRetries = 3;
    this.retryDelay = 5000;

    logger.info(
      {
        modelsPath: this.modelsPath,
        maxRetries: this.maxRetries,
        retryDelay: this.retryDelay,
      },
      "Model manager initialized"
    );
  }

  async ensureModel(task, modelName, options = {}) {
    const cacheKey = `${task}-${modelName}`;

    // Return cached model if already loaded
    if (this.loadedModels.has(cacheKey)) {
      logger.debug({ task, modelName }, "Model found in cache");
      return this.loadedModels.get(cacheKey);
    }

    // Wait for ongoing loading process if exists
    if (this.loadingPromises.has(cacheKey)) {
      logger.debug(
        { task, modelName },
        "Model is currently loading, waiting for completion"
      );
      return await this.loadingPromises.get(cacheKey);
    }

    logger.info({ task, modelName }, "Starting model loading process");
    const loadingPromise = this.loadModel(task, modelName, options);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const model = await loadingPromise;
      this.loadedModels.set(cacheKey, model);
      logger.info({ task, modelName }, "Model loaded and cached successfully");
      return model;
    } catch (error) {
      logger.error(
        { task, modelName, error: error.message },
        "Failed to load model"
      );
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async loadModel(task, modelName, options = {}) {
    const modelPath = path.join(this.modelsPath, modelName);
    let retryCount = 0;

    while (retryCount <= this.maxRetries) {
      try {
        // First attempt: load from local cache
        try {
          await fs.access(modelPath);
          logger.debug(
            { task, modelName, modelPath },
            "Attempting to load model from local cache"
          );

          const model = await pipeline(task, modelPath, {
            ...options,
            local_files_only: true,
            cache_dir: this.modelsPath,
          });

          logger.info(
            { task, modelName },
            "Model loaded successfully from local cache"
          );
          return model;
        } catch (localError) {
          logger.debug(
            { task, modelName, error: localError.message },
            "Local model not found, downloading from remote"
          );
        }

        // Second attempt: download from remote
        await fs.mkdir(this.modelsPath, { recursive: true });
        logger.info(
          { task, modelName },
          "Downloading model from remote repository"
        );

        const model = await pipeline(task, modelName, {
          ...options,
          cache_dir: this.modelsPath,
          local_files_only: false,
        });

        logger.info(
          { task, modelName },
          "Model downloaded and loaded successfully"
        );
        return model;
      } catch (error) {
        retryCount++;
        logger.warn(
          {
            task,
            modelName,
            retryCount,
            maxRetries: this.maxRetries,
            error: error.message,
          },
          "Model loading attempt failed"
        );

        if (retryCount > this.maxRetries) {
          logger.warn(
            { task },
            "Max retries exceeded, attempting fallback model"
          );

          try {
            // Fallback: load default model for the task
            const fallbackModel = await pipeline(task, null, {
              ...options,
              cache_dir: this.modelsPath,
            });

            logger.info({ task }, "Fallback model loaded successfully");
            return fallbackModel;
          } catch (fallbackError) {
            const errorMessage = `Failed to load both specific model (${modelName}) and fallback model for task ${task}. Last error: ${error.message}`;
            logger.error(
              { task, modelName, error: errorMessage },
              "All model loading attempts failed"
            );
            throw new Error(errorMessage);
          }
        }

        // Wait before retry
        logger.debug(
          { task, modelName, retryDelay: this.retryDelay },
          "Waiting before retry"
        );
        await this.sleep(this.retryDelay);
      }
    }
  }

  getModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    const model = this.loadedModels.get(cacheKey);

    if (model) {
      logger.debug({ task, modelName }, "Model retrieved from cache");
    } else {
      logger.debug({ task, modelName }, "Model not found in cache");
    }

    return model;
  }

  hasModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    const exists = this.loadedModels.has(cacheKey);

    logger.debug({ task, modelName, exists }, "Model existence check");
    return exists;
  }

  clearModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    const removed = this.loadedModels.delete(cacheKey);

    if (removed) {
      logger.info({ task, modelName }, "Model removed from cache");
    } else {
      logger.debug({ task, modelName }, "Model was not in cache");
    }

    return removed;
  }

  clearAllModels() {
    const modelCount = this.loadedModels.size;
    this.loadedModels.clear();

    logger.info({ clearedModels: modelCount }, "All models cleared from cache");
  }

  listModels() {
    const models = Array.from(this.loadedModels.keys());
    logger.debug({ modelCount: models.length }, "Listed all cached models");
    return models;
  }

  getLoadingStatus() {
    const status = {
      loaded: Array.from(this.loadedModels.keys()),
      loading: Array.from(this.loadingPromises.keys()),
    };

    logger.debug(
      {
        loadedCount: status.loaded.length,
        loadingCount: status.loading.length,
      },
      "Model loading status requested"
    );

    return status;
  }

  getMemoryUsage() {
    const usage = {
      loadedModelsCount: this.loadedModels.size,
      loadingModelsCount: this.loadingPromises.size,
      modelsPath: this.modelsPath,
    };

    logger.debug(usage, "Memory usage information requested");
    return usage;
  }

  async preloadModels(modelsToLoad = []) {
    logger.info(
      { modelCount: modelsToLoad.length },
      "Starting model preloading"
    );

    // Load multiple models concurrently
    const loadPromises = modelsToLoad.map(({ task, modelName, options }) =>
      this.ensureModel(task, modelName, options).catch((error) => {
        logger.error(
          { task, modelName, error: error.message },
          "Failed to preload model"
        );
        return null;
      })
    );

    const results = await Promise.allSettled(loadPromises);
    const successful = results.filter(
      (result) => result.status === "fulfilled" && result.value !== null
    ).length;

    logger.info(
      {
        successful,
        total: modelsToLoad.length,
        failed: modelsToLoad.length - successful,
      },
      "Model preloading completed"
    );

    return { successful, total: modelsToLoad.length };
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
