import { pipeline, env, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

// Optimize browser environment for faster inference
env.allowLocalModels = false;
env.useBrowserCache = true;
env.allowRemoteModels = true;
// Enable SIMD for faster computations if available
env.allowSimd = true;

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
  static task: 'automatic-speech-recognition' = 'automatic-speech-recognition';
  static model = 'Xenova/whisper-tiny.en';
  static instance: Promise<AutomaticSpeechRecognitionPipeline> | null = null;

  static getInstance(progress_callback?: (data: any) => void) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, {
        progress_callback,
        dtype: {
          encoder_model: 'q8', // Ultra-fast quantization
          decoder_model_merged: 'q4', // Quantized model for browser
        },
        device: 'wasm', // Ensure WASM execution
      }) as Promise<AutomaticSpeechRecognitionPipeline>;
    }
    return this.instance;
  }
}

self.addEventListener('message', async (event) => {
  const message = event.data;
  
  if (message.type === 'load') {
    try {
      await PipelineSingleton.getInstance((progressData) => {
        self.postMessage({ type: 'progress', data: progressData });
      });
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err) });
    }
  } else if (message.type === 'transcribe') {
    try {
      const { audioData } = message;
      
      const transcriber = await PipelineSingleton.getInstance();
      
      const output = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: 'word',
      });
      
      self.postMessage({ type: 'complete', result: output });
    } catch (err) {
      self.postMessage({ type: 'error', error: String(err) });
    }
  }
});
