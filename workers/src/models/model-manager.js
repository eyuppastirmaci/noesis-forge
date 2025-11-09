import { pipeline } from "@huggingface/transformers";
import logger from "../logging/logger.js";
import path from "path";
import fs from "fs";

/**
 * Simplified Model Manager for built-in models
 * Manages loading and caching of pre-downloaded models from workers/models folder
 */
export class ModelManager {
  constructor() {
    this.modelsPath = process.env.MODELS_PATH || "/app/models";
    this.loadedModels = new Map();
    this.loadingPromises = new Map();

    // Built-in model configurations
    this.builtinModels = {
      "text-embedding": {
        // Local quantized BGE-M3 model packaged under the Xenova namespace
        name: "Xenova/bge-m3",
        task: "feature-extraction",
      },
      "image-embedding": {
        // SigLIP feature extractor converted and stored under Xenova namespace
        name: "Xenova/siglip-base-patch16-224",
        task: "image-feature-extraction",
      },
      "summarization": {
        // DistilBART model exported by Xenova for ONNX usage
        name: "Xenova/distilbart-cnn-6-6",
        task: "summarization",
      },
    };
  }

  /**
   * Load a built-in model by type
   * @param {string} modelType - Type of model
   * @param {object} options - Additional options for pipeline
   * @returns {Promise} Loaded model pipeline
   */
  async loadBuiltinModel(modelType, options = {}) {
    const modelConfig = this.builtinModels[modelType];
    if (!modelConfig) {
      throw new Error(`Unknown built-in model type: ${modelType}. Available: ${Object.keys(this.builtinModels).join(', ')}`);
    }

    return await this.ensureModel(modelConfig.task, modelConfig.name, options);
  }

  /**
   * Ensure a model is loaded and cached
   * @param {string} task - Task type
   * @param {string} modelName - Model identifier  
   * @param {object} options - Pipeline options
   * @returns {Promise} Loaded model
   */
  async ensureModel(task, modelName, options = {}) {
    const cacheKey = `${task}-${modelName}`;

    // Return cached model if already loaded
    if (this.loadedModels.has(cacheKey)) {
      return this.loadedModels.get(cacheKey);
    }

    // Wait for ongoing loading process if exists
    if (this.loadingPromises.has(cacheKey)) {
      return await this.loadingPromises.get(cacheKey);
    }

    // Start loading process
    const loadingPromise = this.loadModel(task, modelName, options);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const model = await loadingPromise;
      this.loadedModels.set(cacheKey, model);
      return model;
    } catch (error) {
      logger.error({ task, modelName, error: error.message }, "Failed to load built-in model");
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  /**
   * Load model from local built-in models directory
   * @param {string} task - HuggingFace task type
   * @param {string} modelName - Model identifier
   * @param {object} options - Pipeline options
   * @returns {Promise} Model pipeline
   */
  async loadModel(task, modelName, options = {}) {
    const modelPath = path.join(this.modelsPath, modelName);
    const hasLocalCopy = fs.existsSync(modelPath);

    try {
      if (hasLocalCopy) {
        // Prefer local model files when available
        return await pipeline(task, modelPath, {
          ...options,
          local_files_only: true,
          cache_dir: this.modelsPath,
        });
      }

      logger.warn(
        {
          task,
          modelName,
          modelsPath: this.modelsPath,
        },
        "Local model files not found. Falling back to remote download."
      );

      // Fallback: download model from Hugging Face Hub and cache it locally
      return await pipeline(task, modelName, {
        ...options,
        cache_dir: this.modelsPath,
      });
    } catch (error) {
      const errorMessage =
        `Failed to load built-in model ${modelName} for task ${task}. ` +
        `Ensure model files are present in ${this.modelsPath}/${modelName} or accessible from the Hugging Face Hub. ` +
        `Error: ${error.message}`;

      logger.error(
        {
          task,
          modelName,
          modelsPath: this.modelsPath,
          hasLocalCopy,
          error: errorMessage,
        },
        "Built-in model loading failed"
      );

      throw new Error(errorMessage);
    }
  }

  /**
   * Get cached model
   * @param {string} task - Task type
   * @param {string} modelName - Model name
   * @returns {object|null} Cached model or null
   */
  getModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    return this.loadedModels.get(cacheKey) || null;
  }

  /**
   * Check if model is cached
   * @param {string} task - Task type
   * @param {string} modelName - Model name
   * @returns {boolean} True if model is cached
   */
  hasModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    return this.loadedModels.has(cacheKey);
  }

  /**
   * Clear specific model from cache
   * @param {string} task - Task type
   * @param {string} modelName - Model name
   * @returns {boolean} True if model was removed
   */
  clearModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    const removed = this.loadedModels.delete(cacheKey);
    
    return removed;
  }

  /**
   * Clear all cached models
   */
  clearAllModels() {
    const modelCount = this.loadedModels.size;
    this.loadedModels.clear();
  }

  /**
   * Get list of available built-in models
   * @returns {Array} List of model types
   */
  getAvailableModels() {
    return Object.keys(this.builtinModels);
  }

  /**
   * Get loading status
   * @returns {object} Status of loaded and loading models
   */
  getStatus() {
    return {
      loaded: Array.from(this.loadedModels.keys()),
      loading: Array.from(this.loadingPromises.keys()),
      available: this.getAvailableModels()
    };
  }
}
