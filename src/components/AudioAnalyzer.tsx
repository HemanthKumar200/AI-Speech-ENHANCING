'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type ProgressData = {
  status: string;
  name: string;
  progress?: number;
};

type WordChunk = {
  text: string;
  timestamp: [number, number];
};

export default function AudioAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [result, setResult] = useState<any>(null);
  const [score, setScore] = useState<{ total: number; wpm: number; issues: number } | null>(null);
  
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL('../lib/worker.ts', import.meta.url), {
      type: 'module',
    });

    workerRef.current.onmessage = (e) => {
      const { type, data, result, error } = e.data;
      if (type === 'progress') {
        setProgress(data);
      } else if (type === 'complete') {
        processResults(result);
        setIsProcessing(false);
      } else if (type === 'error') {
        setError(error);
        setIsProcessing(false);
      }
    };

    workerRef.current.postMessage({ type: 'load' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const validateAndProcessAudio = async (selectedFile: File) => {
    setError(null);
    setResult(null);
    setScore(null);
    
    if (!selectedFile.type.startsWith('audio/')) {
      setError('Please upload a valid audio file.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const duration = audioBuffer.duration;
      if (duration < 30 || duration > 45) {
        setError(`Audio must be between 30 and 45 seconds. This audio is ${duration.toFixed(1)}s.`);
        setIsProcessing(false);
        return;
      }

      // Convert to mono Float32Array for transformers.js
      const offlineContext = new OfflineAudioContext(1, audioBuffer.length, 16000);
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineContext.destination);
      source.start();
      const renderedBuffer = await offlineContext.startRendering();
      const audioData = renderedBuffer.getChannelData(0);

      workerRef.current?.postMessage({ type: 'transcribe', audioData });
    } catch (err) {
      setError('Failed to process audio file: ' + String(err));
      setIsProcessing(false);
    }
  };

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndProcessAudio(e.dataTransfer.files[0]);
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessAudio(e.target.files[0]);
    }
  };

  const processResults = (output: any) => {
    if (!output || !output.chunks) return;
    
    setResult(output);
    
    const chunks: WordChunk[] = output.chunks;
    
    if (chunks.length === 0) {
      setScore({ total: 0, wpm: 0, issues: 0 });
      return;
    }

    // Heuristics for fluency score
    let issuesCount = 0;
    let totalDuration = chunks[chunks.length - 1].timestamp[1] - chunks[0].timestamp[0];
    if (totalDuration <= 0) totalDuration = 1;
    
    const words = chunks.length;
    const wpm = Math.round((words / totalDuration) * 60);
    
    const fillerWords = ['um', 'uh', 'like', 'ah', 'you know'];
    
    chunks.forEach((chunk, index) => {
      const cleanWord = chunk.text.trim().toLowerCase().replace(/[^\w\s]|_/g, "");
      
      // Check for filler words
      if (fillerWords.includes(cleanWord)) {
        issuesCount++;
      }
      
      // Check for hesitations (pauses > 1.0s)
      if (index > 0) {
        const prevChunk = chunks[index - 1];
        const gap = chunk.timestamp[0] - prevChunk.timestamp[1];
        if (gap > 1.0) {
          issuesCount++;
        }
      }
    });

    // Score from 0 to 100 based on issues and WPM
    // Ideal WPM: 120-160. Penalize if too slow or too fast.
    let wpmScore = 100;
    if (wpm < 100) wpmScore -= (100 - wpm);
    if (wpm > 180) wpmScore -= (wpm - 180);
    
    // Penalize for issues (fillers and hesitations)
    let issuePenalty = issuesCount * 5; 
    
    let finalScore = Math.max(0, Math.min(100, Math.round(wpmScore - issuePenalty)));
    
    setScore({ total: finalScore, wpm, issues: issuesCount });
  };

  const renderTranscript = () => {
    if (!result || !result.chunks) return null;
    
    return (
      <div className="mt-8 p-6 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-4">Transcription Analysis</h3>
        
        <div className="flex gap-6 mb-6">
          <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/20">
            <p className="text-sm text-blue-300 uppercase tracking-wider">Fluency Score</p>
            <p className="text-4xl font-bold text-blue-400">{score?.total}/100</p>
          </div>
          <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <p className="text-sm text-purple-300 uppercase tracking-wider">Speech Rate</p>
            <p className="text-4xl font-bold text-purple-400">{score?.wpm} <span className="text-lg">WPM</span></p>
          </div>
          <div className="p-4 bg-rose-500/10 rounded-xl border border-rose-500/20">
            <p className="text-sm text-rose-300 uppercase tracking-wider">Disfluencies</p>
            <p className="text-4xl font-bold text-rose-400">{score?.issues}</p>
          </div>
        </div>

        <div className="leading-relaxed text-lg text-gray-200">
          {result.chunks.map((chunk: WordChunk, idx: number) => {
            const cleanWord = chunk.text.trim().toLowerCase().replace(/[^\w\s]|_/g, "");
            const isFiller = ['um', 'uh', 'like', 'ah'].includes(cleanWord);
            
            let isHesitation = false;
            if (idx > 0) {
              const gap = chunk.timestamp[0] - result.chunks[idx - 1].timestamp[1];
              if (gap > 1.0) isHesitation = true;
            }

            let colorClass = "text-gray-200";
            if (isFiller) colorClass = "text-rose-400 font-semibold underline decoration-rose-500/50";
            if (isHesitation) colorClass = "bg-yellow-500/20 text-yellow-300 px-1 rounded-md";

            return (
              <span key={idx} className={`mr-1 ${colorClass}`} title={isFiller ? "Filler word detected" : isHesitation ? "Long pause before this word" : ""}>
                {chunk.text}
              </span>
            );
          })}
        </div>
        
        <div className="mt-6 flex gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-400 rounded-full"></div> Filler Word</div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500/40 rounded-full"></div> Hesitation / Long Pause</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div 
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={`relative group overflow-hidden rounded-3xl border-2 border-dashed transition-all duration-300 p-12 text-center
          ${isProcessing ? 'border-blue-500 bg-blue-500/5' : 'border-gray-600 hover:border-blue-400 hover:bg-white/5'}
          bg-black/20 backdrop-blur-md`}
      >
        <input 
          type="file" 
          accept="audio/*" 
          onChange={onFileChange} 
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          disabled={isProcessing}
        />
        
        <div className="pointer-events-none flex flex-col items-center gap-4">
          {isProcessing ? (
            <Loader2 className="w-16 h-16 text-blue-400 animate-spin" />
          ) : (
            <UploadCloud className="w-16 h-16 text-gray-400 group-hover:text-blue-400 transition-colors" />
          )}
          
          <div>
            <h2 className="text-2xl font-semibold text-white mb-2">
              {isProcessing ? 'Processing Audio...' : 'Upload English Speech'}
            </h2>
            <p className="text-gray-400">Drag and drop your audio file here, or click to browse.</p>
            <p className="text-sm text-blue-400 font-medium mt-2">Required: 30 to 45 seconds</p>
          </div>

          {progress && isProcessing && (
            <div className="w-full max-w-md mt-6">
              <div className="flex justify-between text-sm mb-2 text-gray-300">
                <span>{progress.status === 'downloading' ? `Downloading ${progress.name}...` : progress.status}</span>
                {progress.progress !== undefined && <span>{Math.round(progress.progress)}%</span>}
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress.progress || 0}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {renderTranscript()}
    </div>
  );
}
