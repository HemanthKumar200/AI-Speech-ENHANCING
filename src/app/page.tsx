import AudioAnalyzer from '@/components/AudioAnalyzer';
import { ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] selection:bg-blue-500/30 text-slate-200 p-8 sm:p-24 flex flex-col items-center">
      
      <div className="max-w-4xl w-full">
        <header className="mb-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Livo AI Assessment
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
            Fluency Scorer
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Upload your English speech audio (30-45 seconds) to get an instant pronunciation and fluency score. We analyze your pacing and highlight areas for improvement.
          </p>
        </header>

        <AudioAnalyzer />

        <footer className="mt-24 border-t border-slate-800 pt-8 text-center text-slate-500 text-sm">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-emerald-500/70" />
            <span className="font-medium text-slate-400">100% Private & DPDP Compliant</span>
          </div>
          <p className="max-w-xl mx-auto">
            Your audio never leaves your device. All processing is done locally in your browser using Web Workers and transformers.js to guarantee your privacy and comply with India's Digital Personal Data Protection Act 2023.
          </p>
        </footer>
      </div>
    </main>
  );
}
