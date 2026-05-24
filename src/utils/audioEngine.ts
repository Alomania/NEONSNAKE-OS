/**
 * Cyber-Neon Web Audio Engine
 * Live synthesizes 3 retro-future tracks and game SFX.
 * Includes real-time visualizer support using AnalyserNode.
 */

class SynthAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  
  // Sequencer scheduling variables
  private isPlaying = false;
  private currentTrackId = 'cyber-horizon';
  private bpm = 120;
  private currentStep = 0;
  private nextNoteTime = 0.0;
  private timerId: number | null = null;
  
  // Custom synthesizer instruments (stored for dynamic parameter adaptation)
  private playbackRate = 1.0;
  private lowpassFilter: BiquadFilterNode | null = null;
  private volumeLevel = 0.5;

  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this browser.');
      return;
    }
    
    this.ctx = new AudioContextClass();
    
    // Master routing: Synth -> Filter -> Analyser -> Master Gain -> Destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.volumeLevel;

    this.lowpassFilter = this.ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.value = 4000;
    this.lowpassFilter.Q.value = 1.2;

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 128; // Rapid update rate for visualizer
    
    // Connect nodes
    this.lowpassFilter.connect(this.analyser);
    this.analyser.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);
  }

  getAnalyser() {
    this.init();
    return this.analyser;
  }

  setVolume(level: number) {
    this.volumeLevel = Math.max(0, Math.min(1, level));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volumeLevel, this.ctx?.currentTime || 0);
    }
  }

  setFilterCutoff(percent: number) {
    if (this.lowpassFilter && this.ctx) {
      // Scale logarithmic frequency between 150Hz and 8000Hz
      const minFreq = 150;
      const maxFreq = 8000;
      const freq = minFreq + (maxFreq - minFreq) * percent;
      this.lowpassFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    }
  }

  play(trackId: string, bpm: number) {
    this.init();
    if (this.ctx?.state === 'suspended') {
      this.ctx.resume();
    }
    
    this.currentTrackId = trackId;
    this.bpm = bpm;
    
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.currentStep = 0;
    if (this.ctx) {
      this.nextNoteTime = this.ctx.currentTime;
      this.scheduler();
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  stop() {
    this.pause();
    this.currentStep = 0;
  }

  // Sequencer scheduler running ahead of time
  private scheduler = () => {
    if (!this.isPlaying || !this.ctx) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + 0.150) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);
      this.advanceStep();
    }
    
    this.timerId = window.setTimeout(this.scheduler, 40);
  };

  private advanceStep() {
    const secondsPerBeat = 60.0 / this.bpm;
    // We play 16th notes, so 4 steps per beat
    const stepDuration = secondsPerBeat / 4;
    this.nextNoteTime += stepDuration;
    this.currentStep = (this.currentStep + 1) % 16;
  }

  // Synthesis engine for chiptune & synthwave patterns
  private scheduleNote(step: number, time: number) {
    if (!this.ctx) return;

    // Define synthetic bass/melody patterns based on the active track
    if (this.currentTrackId === 'cyber-horizon') {
      // 1. CYBER HORIZON: Drives at 120 bpm, energetic minor pentatonic (A minor)
      // Classic synthwave: driving 4/4 kick, hi-hat on up-beats, pulsing synth bass
      this.synthDrums(step, time, true, false);
      this.synthBass(step, time, ['A1', 'A1', 'C2', 'C2', 'G1', 'G1', 'D2', 'E2'][Math.floor(step / 2) % 8], 'sawtooth');
      
      const leadNotes = ['A3', 'C4', 'E4', 'G4', 'A4', 'G4', 'E4', 'C4'];
      const melPattern = [0, -1, 4, -1, 3, 5, -1, 2, 7, -1, 1, 4, -1, 5, 2, -1];
      const noteIdx = melPattern[step];
      if (noteIdx !== -1) {
        this.synthArp(time, leadNotes[noteIdx % leadNotes.length], 'sawtooth', 0.18, 0.1);
      }

    } else if (this.currentTrackId === 'neon-glitch') {
      // 2. NEON GLITCH: Fast 142 bpm, high performance chiptune scales
      // Bitcrushed kick-click drums, frantic 16th note square arpeggios
      this.synthDrums(step, time, false, true);
      this.synthBass(step, time, ['E1', 'G1', 'A1', 'B1'][Math.floor(step / 4) % 4], 'square');
      
      // Frantic high-speed chiptune arpeggio
      const chipScale = ['E4', 'G4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5'];
      const arpIdx = (step * 3 + Math.floor(step / 4)) % chipScale.length;
      if (step % 2 === 0) {
        this.synthArp(time, chipScale[arpIdx], 'square', 0.08, 0.03);
      }

    } else if (this.currentTrackId === 'vapor-chill') {
      // 3. VAPOR CHILL: Slower 92 bpm, soft dreaming pads, slow resonant bass
      this.synthDrums(step, time, false, false, 0.4); // soft hits
      this.synthBass(step, time, ['F1', 'F1', 'C1', 'C1', 'G1', 'G1', 'A1', 'A1'][Math.floor(step / 2) % 8], 'triangle');
      
      // Soft, airy delayed chime synth
      const vaporChords = ['C4', 'E4', 'G4', 'B4', 'D5'];
      if (step % 4 === 1) {
        const chordNote = vaporChords[(Math.floor(step / 4) * 2) % vaporChords.length];
        this.synthArp(time, chordNote, 'sine', 0.6, 0.15);
      }
    }
  }

  // Synthesized instruments
  private noteToFreq(note: string): number {
    const notes: Record<string, number> = {
      'C1': 32.70, 'D1': 36.71, 'E1': 41.20, 'F1': 43.65, 'G1': 49.00, 'A1': 55.00, 'B1': 61.74,
      'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
      'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
      'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    };
    return notes[note] || 440;
  }

  // Synthesize Drums
  private synthDrums(step: number, time: number, runHats = true, isChiptune = false, dryScale = 1.0) {
    if (!this.ctx || !this.lowpassFilter) return;

    // KICK on beat 1, 5, 9, 13
    if (step % 4 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.lowpassFilter);

      osc.type = isChiptune ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isChiptune ? 120 : 160, time);
      // Sweeps pitch down quickly for punch
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);

      gain.gain.setValueAtTime(0.6 * dryScale, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

      osc.start(time);
      osc.stop(time + 0.16);
    }

    // SNARE on beat 5 and 13 (step 4 and 12)
    if (step === 4 || step === 12) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.lowpassFilter);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      gain.gain.setValueAtTime(0.3 * dryScale, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

      osc.start(time);
      osc.stop(time + 0.13);

      // Noise component simulated with rapid randomized sound
      try {
        const bufferSize = this.ctx.sampleRate * 0.1; // 100ms
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.value = 1000;
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12 * dryScale, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.lowpassFilter);
        
        noise.start(time);
        noise.stop(time + 0.11);
      } catch (e) {
        // Fallback if buffer creation has errors
      }
    }

    // HI-HAT on steps 2, 6, 10, 14 (up-beats)
    if (runHats && step % 4 === 2) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.lowpassFilter);

      osc.type = 'square';
      osc.frequency.setValueAtTime(8000, time);
      
      gain.gain.setValueAtTime(0.04 * dryScale, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

      osc.start(time);
      osc.stop(time + 0.06);
    }
  }

  // Synthesize rhythmic bass
  private synthBass(step: number, time: number, note: string, type: OscillatorType) {
    if (!this.ctx || !this.lowpassFilter) return;

    // standard sync bass on 8th notes (steps 0, 2, 4, 6 etc.)
    if (step % 2 === 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.lowpassFilter);

      osc.type = type;
      const baseFreq = this.noteToFreq(note);
      osc.frequency.setValueAtTime(baseFreq, time);

      // short pluck envelope
      gain.gain.setValueAtTime(0.28, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      osc.start(time);
      osc.stop(time + 0.15);
    }
  }

  // Synthesize sharp arpeggios/leads
  private synthArp(time: number, note: string, type: OscillatorType, duration = 0.12, volume = 0.08) {
    if (!this.ctx || !this.lowpassFilter) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.lowpassFilter);

    osc.type = type;
    osc.frequency.setValueAtTime(this.noteToFreq(note), time);

    // Filter dynamic sweep on lead arpeggios
    const filterSweeper = this.ctx.createBiquadFilter();
    filterSweeper.type = 'bandpass';
    filterSweeper.frequency.setValueAtTime(1500, time);
    filterSweeper.frequency.exponentialRampToValueAtTime(400, time + duration);
    filterSweeper.Q.value = 1.0;

    osc.disconnect(gain);
    osc.connect(filterSweeper);
    filterSweeper.connect(gain);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.start(time);
    osc.stop(time + duration + 0.05);
  }

  // GAME EVENT SFX triggers instantly (can be layered alongside background tracks)
  triggerSfx(type: 'food' | 'gameover' | 'keypress' | 'powerup') {
    this.init();
    if (!this.ctx) return;
    
    const time = this.ctx.currentTime;
    
    if (type === 'food') {
      // Direct vintage sliding reward beeps
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      osc.type = 'square';
      
      osc.connect(this.masterGain || this.ctx.destination);
      osc.frequency.setValueAtTime(350, time);
      osc.frequency.exponentialRampToValueAtTime(1200, time + 0.12);
      
      gain.gain.setValueAtTime(0.15, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
      
      osc.start(time);
      osc.stop(time + 0.16);
      
    } else if (type === 'powerup') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      osc.type = 'sawtooth';
      
      osc.connect(this.masterGain || this.ctx.destination);
      osc.frequency.setValueAtTime(523.25, time); // C5
      osc.frequency.setValueAtTime(659.25, time + 0.07); // E5
      osc.frequency.setValueAtTime(783.99, time + 0.14); // G5
      osc.frequency.setValueAtTime(1046.50, time + 0.21); // C6
      
      gain.gain.setValueAtTime(0.12, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
      
      osc.start(time);
      osc.stop(time + 0.32);

    } else if (type === 'gameover') {
      // Retro sad sliding metal fail sound
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      osc.type = 'sawtooth';
      
      osc.connect(this.masterGain || this.ctx.destination);
      osc.frequency.setValueAtTime(220, time);
      osc.frequency.linearRampToValueAtTime(45, time + 0.65);
      
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.7);
      
      osc.start(time);
      osc.stop(time + 0.75);

    } else if (type === 'keypress') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      osc.type = 'sine';
      
      osc.connect(this.masterGain || this.ctx.destination);
      osc.frequency.setValueAtTime(600, time);
      
      gain.gain.setValueAtTime(0.03, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      
      osc.start(time);
      osc.stop(time + 0.04);
    }
  }
}

export const audioEngine = new SynthAudioEngine();
