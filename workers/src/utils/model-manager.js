import { pipeline } from '@huggingface/transformers';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class ModelManager {
  constructor() {
    this.modelsPath = process.env.MODELS_PATH || '/app/models';
    this.loadedModels = new Map(); // Cache for loaded models
    this.loadingPromises = new Map(); // Track loading promises to avoid duplicate downloads
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds
  }

  async ensureModel(task, modelName, options = {}) {
    const cacheKey = `${task}-${modelName}`;
    
    // Return cached model if available
    if (this.loadedModels.has(cacheKey)) {
      console.log(`Model ${modelName} already loaded in memory for task ${task}`);
      return this.loadedModels.get(cacheKey);
    }

    // If model is currently being loaded, wait for it
    if (this.loadingPromises.has(cacheKey)) {
      console.log(`Model ${modelName} is currently being loaded, waiting...`);
      return await this.loadingPromises.get(cacheKey);
    }

    // Start loading the model
    const loadingPromise = this.loadModel(task, modelName, options);
    this.loadingPromises.set(cacheKey, loadingPromise);

    try {
      const model = await loadingPromise;
      this.loadedModels.set(cacheKey, model);
      console.log(`Model ${modelName} successfully loaded and cached`);
      return model;
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw error;
    } finally {
      this.loadingPromises.delete(cacheKey);
    }
  }

  async loadModel(task, modelName, options = {}) {
    const modelPath = path.join(this.modelsPath, modelName.replace('/', '_'));
    
    let retryCount = 0;
    
    while (retryCount <= this.maxRetries) {
      try {
        // First try to load from local cache
        try {
          await fs.access(modelPath);
          console.log(`Model ${modelName} found locally at ${modelPath}`);
          
          const model = await pipeline(task, modelPath, {
            ...options,
            local_files_only: true,
            cache_dir: this.modelsPath
          });
          
          console.log(`Model ${modelName} loaded from local cache`);
          return model;
        } catch (localError) {
          console.log(`Local model not found or failed to load: ${localError.message}`);
          // Fall through to download
        }

        // Download model
        console.log(`Downloading model ${modelName} (attempt ${retryCount + 1}/${this.maxRetries + 1})...`);
        
        // Ensure models directory exists
        await fs.mkdir(this.modelsPath, { recursive: true });
        
        const model = await pipeline(task, modelName, {
          ...options,
          cache_dir: this.modelsPath,
          local_files_only: false
        });

        console.log(`Model ${modelName} downloaded and loaded successfully`);
        return model;
        
      } catch (error) {
        retryCount++;
        
        if (retryCount > this.maxRetries) {
          console.error(`Failed to download model ${modelName} after ${this.maxRetries + 1} attempts:`, error);
          
          // Try to use a fallback model for the task
          console.log(`Attempting to use default model for task: ${task}`);
          
          try {
            const fallbackModel = await pipeline(task, null, {
              ...options,
              cache_dir: this.modelsPath
            });
            
            console.log(`Fallback model loaded for task: ${task}`);
            return fallbackModel;
            
          } catch (fallbackError) {
            console.error(`Fallback model also failed:`, fallbackError);
            throw new Error(`Failed to load both specific model (${modelName}) and fallback model for task ${task}. Last error: ${error.message}`);
          }
        }
        
        console.log(`Retrying in ${this.retryDelay/1000} seconds...`);
        await this.sleep(this.retryDelay);
      }
    }
  }

  getModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    return this.loadedModels.get(cacheKey);
  }

  hasModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    return this.loadedModels.has(cacheKey);
  }

  clearModel(task, modelName) {
    const cacheKey = `${task}-${modelName}`;
    const removed = this.loadedModels.delete(cacheKey);
    
    if (removed) {
      console.log(`Model ${modelName} removed from cache`);
    }
    
    return removed;
  }

  clearAllModels() {
    const count = this.loadedModels.size;
    this.loadedModels.clear();
    console.log(`Cleared ${count} models from cache`);
  }

  listModels() {
    return Array.from(this.loadedModels.keys());
  }

  getLoadingStatus() {
    return {
      loaded: Array.from(this.loadedModels.keys()),
      loading: Array.from(this.loadingPromises.keys())
    };
  }

  getMemoryUsage() {
    return {
      loadedModelsCount: this.loadedModels.size,
      loadingModelsCount: this.loadingPromises.size,
      modelsPath: this.modelsPath
    };
  }

  async preloadModels(modelsToLoad = []) {
    console.log(`Preloading ${modelsToLoad.length} models...`);
    
    const loadPromises = modelsToLoad.map(({ task, modelName, options }) => 
      this.ensureModel(task, modelName, options).catch(error => {
        console.error(`Failed to preload model ${modelName}:`, error);
        return null;
      })
    );
    
    const results = await Promise.allSettled(loadPromises);
    const successful = results.filter(result => result.status === 'fulfilled' && result.value !== null).length;
    
    console.log(`Preloaded ${successful}/${modelsToLoad.length} models successfully`);
    return { successful, total: modelsToLoad.length };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}