import { useState } from 'react';
import { Gamepad2, Disc, VolumeX, Volume2, Info, ArrowUpRight } from 'lucide-react';
import { Track } from './types';
import MusicPlayer, { TRACKS } from './components/MusicPlayer';
import SnakeGame from './components/SnakeGame';
import { audioEngine } from './utils/audioEngine';

export default function App() {
  const [activeTrack, setActiveTrack] = useState<Track>(TRACKS[0]);
  const [isPlayingGlobal, setIsPlayingGlobal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [soundStarted, setSoundStarted] = useState(false);

  // Initialize Web Audio Context from a clean user click handler
  const handleAudioInit = () => {
    if (!soundStarted) {
      audioEngine.init();
      setSoundStarted(true);
    }
  };

  const handleMuteToggle = () => {
    handleAudioInit();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setVolume(nextMuted ? 0 : 0.4);
    audioEngine.triggerSfx('keypress');
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] pb-12 flex flex-col relative overflow-x-hidden">
      
      {/* Decorative fluorescent background laser beam lines */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
      <div className="absolute top-0 left-[15%] w-[1px] h-32 bg-gradient-to-b from-cyan-500/5 to-transparent" />
      <div className="absolute top-0 right-[15%] w-[1px] h-32 bg-gradient-to-b from-fuchsia-500/5 to-transparent" />

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8 flex-1 flex flex-col gap-6">
        
        {/* Navigation & Brand Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center bg-[#0a0a0a] border border-zinc-800 px-5 sm:px-6 py-4 rounded-2xl gap-4 backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-fuchsia-500/5 pointer-events-none" />
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.5)] flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl sm:text-2xl font-orbitron font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-zinc-100 to-fuchsia-400 tracking-wider">
                  NEON<span className="text-cyan-400">SNAKE</span> OS
                </h1>
                <span className="text-[10px] font-mono text-cyan-400 border border-cyan-500/30 bg-cyan-950/20 px-1.5 py-0.5 rounded uppercase tracking-widest animate-pulse">
                  v2.0
                </span>
              </div>
              <p className="text-[10px] sm:text-xs font-mono text-zinc-500 tracking-tight mt-0.5">
                System Status: <span className="text-emerald-400 font-bold">STABLE // 60 FPS</span>
              </p>
            </div>
          </div>

          {/* Quick Stats & Audio Status */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button 
              onClick={handleMuteToggle}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2 text-xs font-mono font-bold ${
                isMuted 
                  ? 'border-red-500/30 bg-red-950/10 text-red-400 hover:bg-red-950/20' 
                  : 'border-zinc-850 bg-black/40 text-zinc-300 hover:bg-zinc-900/60'
              }`}
              title="Toggle Audio Engine Output"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              <span className="hidden leading-none md:inline">{isMuted ? 'SOUND OFF' : 'SOUND ON'}</span>
            </button>
            
            <div className="p-2 px-3 bg-black/40 rounded-xl border border-zinc-800 text-right font-mono text-[10px]">
              <span className="text-zinc-500 block uppercase font-semibold text-[8px]">ACTIVE FREQUENCY</span>
              <span className="text-fuchsia-400 font-bold">{activeTrack.bpm} BPM BEATS</span>
            </div>
          </div>
        </header>

        {/* Dashboard layout */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left panel: Music Synth Cassette Desk - takes 5 cols out of 12 */}
          <div className="lg:col-span-5 h-full flex flex-col">
            <MusicPlayer 
              onTrackChange={setActiveTrack}
              onAudioInit={handleAudioInit}
              isPlayingGlobal={isPlayingGlobal}
              setIsPlayingGlobal={setIsPlayingGlobal}
            />
          </div>

          {/* Center panel: Snake Grid Console - takes 7 cols out of 12 */}
          <div className="lg:col-span-7 h-full flex flex-col">
            <SnakeGame 
              activeTrack={activeTrack}
              isPlayingGlobal={isPlayingGlobal}
              setIsPlayingGlobal={setIsPlayingGlobal}
            />
          </div>

        </main>

        {/* Informational Guidance Widget Footer */}
        <section className="bg-[#080808] border border-zinc-900 p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-[circle_at_bottom_right] from-fuchsia-500/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex gap-3.5 items-start">
            <div className="p-2 bg-black/40 rounded-xl border border-zinc-800 text-fuchsia-400 mt-0.5 flex-shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-orbitron font-bold text-zinc-100 uppercase tracking-widest">
                OS OPERATION MANUAL
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                This cockpit binds retro synthesis with modern snake mechanics. Selecting tracks from the 
                <span className="text-cyan-400 font-bold"> SYNTH BANK CHANNELS </span> dynamically shifts the snake grid speed based on music pace (BPM). Eating standard pink food speeds up your tail, cyan food grants double points, while rare glittering golden stars activate multipliers and trigger deep synth-pad chord shifts.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col justify-center gap-3 flex-shrink-0 min-w-[210px] items-stretch">
            <div className="p-3 bg-black/40 border border-zinc-800 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-500 flex items-center gap-1">
                <Disc className="w-4 h-4 text-cyan-400" /> ENGINE
              </span>
              <span className={`font-bold uppercase ${soundStarted ? 'text-emerald-400' : 'text-amber-500'}`}>
                {soundStarted ? 'Active (WebAudio)' : 'Armed & Ready'}
              </span>
            </div>
            <a 
              href="#music-console"
              className="px-4 py-2 bg-gradient-to-r from-cyan-600/10 to-fuchsia-600/10 border border-zinc-800 rounded-xl text-center text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition-all flex items-center justify-center gap-1"
            >
              <span>FOCUS CD PLAYER</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-cyan-400" />
            </a>
          </div>
        </section>

      </div>

      {/* Humble craft credits */}
      <footer className="mt-auto pt-8 text-center text-[10px] font-mono text-zinc-700 select-none">
        NEON SYNTH SNAKE &bull; CHIP-GENERATED AUDIO CHANNELS &bull; EST. 2026
      </footer>

    </div>
  );
}
