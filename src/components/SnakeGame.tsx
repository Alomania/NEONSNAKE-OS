import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Trophy, Cpu, Zap, Radio } from 'lucide-react';
import { Direction, Position, Food, GameStatus, HighScore, Track } from '../types';
import { audioEngine } from '../utils/audioEngine';

interface SnakeGameProps {
  activeTrack: Track;
  isPlayingGlobal: boolean;
  setIsPlayingGlobal: (playing: boolean) => void;
}

const GRID_SIZE = 20; // 20x20 grid

export default function SnakeGame({ activeTrack, isPlayingGlobal, setIsPlayingGlobal }: SnakeGameProps) {
  // Game states
  const [snake, setSnake] = useState<Position[]>([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 },
  ]);
  const [direction, setDirection] = useState<Direction>('UP');
  const [food, setFood] = useState<Food | null>(null);
  const [status, setStatus] = useState<GameStatus>('IDLE');
  const [score, setScore] = useState(0);
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [hasEatenGolden, setHasEatenGolden] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1.0);
  const [playerName, setPlayerName] = useState('RENEGADE');

  // Particle systems for special eating effects
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; alpha: number; size: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);
  // Keep changing direction safe from double taps within a single frame
  const lastDirectionRef = useRef<Direction>('UP');

  // Calculates speed (ms per tick) based on the current track BPM and state multiplier
  const getTickRate = useCallback(() => {
    // Cyber Horizon: 120BPM => normal pace (~150ms)
    // Neon Glitch: 142BPM => frantic pace (~110ms)
    // Vapor Chill: 92BPM => relaxed pace (~210ms)
    const baseMs = (60000 / activeTrack.bpm) * 0.4; // Scaled to game speed ratios
    return (baseMs / speedMultiplier);
  }, [activeTrack, speedMultiplier]);

  // Load high scores
  useEffect(() => {
    const raw = localStorage.getItem('neon_snake_highscores');
    if (raw) {
      try {
        setHighScores(JSON.parse(raw));
      } catch (e) {
        setHighScores([]);
      }
    } else {
      const defaultScores: HighScore[] = [
        { name: 'SYNTH_WAVE', score: 1200, date: '2026', trackName: 'Cyber Horizon' },
        { name: 'CHIP_HERO', score: 950, date: '2026', trackName: 'Neon Glitch' },
        { name: 'VAPOR_BOY', score: 600, date: '2026', trackName: 'Vapor Chill' },
      ];
      localStorage.setItem('neon_snake_highscores', JSON.stringify(defaultScores));
      setHighScores(defaultScores);
    }
  }, []);

  // Save new highscore
  const saveHighScore = useCallback((finalScore: number) => {
    if (finalScore <= 0) return;
    const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const record: HighScore = {
      name: playerName.trim().toUpperCase() || 'ANON',
      score: finalScore,
      date: dateStr,
      trackName: activeTrack.title,
    };

    setHighScores((prev) => {
      const merged = [...prev, record].sort((a, b) => b.score - a.score).slice(0, 5);
      localStorage.setItem('neon_snake_highscores', JSON.stringify(merged));
      return merged;
    });
  }, [playerName, activeTrack]);

  // Spawn random food
  const spawnFood = useCallback((currentSnake: Position[]) => {
    let attempts = 0;
    let rx = 0;
    let ry = 0;
    let matchesSnake = true;

    while (matchesSnake && attempts < 100) {
      rx = Math.floor(Math.random() * GRID_SIZE);
      ry = Math.floor(Math.random() * GRID_SIZE);
      matchesSnake = currentSnake.some(seg => seg.x === rx && seg.y === ry);
      attempts++;
    }

    // Determine type: 10% golden, 20% double, 70% standard
    const roll = Math.random();
    let type: 'standard' | 'double' | 'golden' = 'standard';
    let points = 10;
    let color = '#ff007f'; // Neon pink
    let glow = 'rgba(255, 0, 127, 0.8)';

    if (roll < 0.12) {
      type = 'golden';
      points = 50;
      color = '#eab308'; // Amber-Gold
      glow = 'rgba(234, 179, 8, 0.9)';
    } else if (roll < 0.32) {
      type = 'double';
      points = 20;
      color = '#00f0ff'; // Neon Cyan
      glow = 'rgba(0, 240, 255, 0.9)';
    }

    setFood({
      x: rx,
      y: ry,
      type,
      points,
      color,
      glow,
    });
  }, []);

  // Initialize Game
  const resetGame = () => {
    audioEngine.triggerSfx('keypress');
    setSnake([
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ]);
    setDirection('UP');
    lastDirectionRef.current = 'UP';
    setScore(0);
    setMultiplier(1);
    setSpeedMultiplier(1.0);
    setHasEatenGolden(false);
    
    // Auto-launch current soundtrack if it isn't playing
    if (!isPlayingGlobal) {
      audioEngine.play(activeTrack.id, activeTrack.bpm);
      setIsPlayingGlobal(true);
    }

    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 },
    ];
    spawnFood(initialSnake);
    setStatus('PLAYING');
  };

  const handleKeyPress = useCallback((dir: Direction) => {
    if (status !== 'PLAYING') return;
    
    const lastDir = lastDirectionRef.current;
    if (dir === 'UP' && lastDir !== 'DOWN') setDirection('UP');
    if (dir === 'DOWN' && lastDir !== 'UP') setDirection('DOWN');
    if (dir === 'LEFT' && lastDir !== 'RIGHT') setDirection('LEFT');
    if (dir === 'RIGHT' && lastDir !== 'LEFT') setDirection('RIGHT');
    
    audioEngine.triggerSfx('keypress');
  }, [status]);

  // Keys Hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keys: Record<string, Direction> = {
        ArrowUp: 'UP', w: 'UP', W: 'UP',
        ArrowDown: 'DOWN', s: 'DOWN', S: 'DOWN',
        ArrowLeft: 'LEFT', a: 'LEFT', A: 'LEFT',
        ArrowRight: 'RIGHT', d: 'RIGHT', D: 'RIGHT',
      };
      if (keys[e.key]) {
        e.preventDefault();
        handleKeyPress(keys[e.key]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress]);

  // Game tick loop
  useEffect(() => {
    if (status !== 'PLAYING') return;

    const gameTick = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        let nextHead = { ...head };

        switch (direction) {
          case 'UP': nextHead.y -= 1; break;
          case 'DOWN': nextHead.y += 1; break;
          case 'LEFT': nextHead.x -= 1; break;
          case 'RIGHT': nextHead.x += 1; break;
        }

        lastDirectionRef.current = direction;

        // Check self-collision
        const hitSelf = prevSnake.some((seg) => seg.x === nextHead.x && seg.y === nextHead.y);
        // Check grid boundary collision
        const hitBound = nextHead.x < 0 || nextHead.x >= GRID_SIZE || nextHead.y < 0 || nextHead.y >= GRID_SIZE;

        if (hitSelf || hitBound) {
          audioEngine.triggerSfx('gameover');
          setStatus('GAMEOVER');
          saveHighScore(score);
          return prevSnake;
        }

        const newSnake = [nextHead, ...prevSnake];

        // Check food interaction
        if (food && nextHead.x === food.x && nextHead.y === food.y) {
          // Trigger reward triggers
          const isGold = food.type === 'golden';
          audioEngine.triggerSfx(isGold ? 'powerup' : 'food');
          
          // Scores
          const addedPoints = food.points * multiplier;
          setScore((s) => s + addedPoints);
          
          // Spawn bursts of neon glow particles
          const canvas = canvasRef.current;
          if (canvas) {
            const hScaleX = (canvas.width / (window.devicePixelRatio || 1)) / GRID_SIZE;
            const hScaleY = (canvas.height / (window.devicePixelRatio || 1)) / GRID_SIZE;
            const pX = (food.x + 0.5) * hScaleX;
            const pY = (food.y + 0.5) * hScaleY;

            for (let i = 0; i < 15; i++) {
              particlesRef.current.push({
                x: pX,
                y: pY,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                color: food.color,
                alpha: 1.0,
                size: Math.random() * 3 + 2,
              });
            }
          }

          if (isGold) {
            setHasEatenGolden(true);
            setMultiplier((m) => m + 1);
            setSpeedMultiplier((sm) => sm + 0.15); // temp rush
            setTimeout(() => {
              setSpeedMultiplier((sm) => Math.max(1.0, sm - 0.15));
              setHasEatenGolden(false);
            }, 6000);
          }

          // Spawns replacement food
          spawnFood(newSnake);

          // Growth rules: Golden food doesn't grow snake segments (pure bonus score),
          // Double grows twice (+2 tick steps), simple standard grows by 1
          if (food.type === 'double') {
            // Keep tail this step and allow extra segment expansion
            return newSnake;
          } else if (food.type === 'golden') {
            // No growth, pop tail to keep size fixed
            newSnake.pop();
            return newSnake;
          } else {
            // standard growth: keep head, discard extreme tail segment
            // Wait, standard grows by 1 segment, which happens by NOT popping tail
            return newSnake;
          }
        } else {
          // Normal slither step: remove last tail segment
          newSnake.pop();
          return newSnake;
        }
      });

      // Schedule next tick
      timerRef.current = window.setTimeout(gameTick, getTickRate());
    };

    timerRef.current = window.setTimeout(gameTick, getTickRate());

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [direction, food, status, multiplier, getTickRate, score, spawnFood, saveHighScore]);

  // High performance Canvas Drawer loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animeId: number;

    const render = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, width, height);

      // 1. Draw glowing neon wireframe grid lines
      ctx.strokeStyle = status === 'PLAYING' && hasEatenGolden ? 'rgba(234,179,8,0.1)' : 'rgba(0, 240, 255, 0.05)';
      ctx.lineWidth = 1;
      const cellW = width / GRID_SIZE;
      const cellH = height / GRID_SIZE;

      for (let i = 0; i <= GRID_SIZE; i++) {
        // Vertical grid lines
        ctx.beginPath();
        ctx.moveTo(i * cellW, 0);
        ctx.lineTo(i * cellW, height);
        ctx.stroke();

        // Horizontal grid lines
        ctx.beginPath();
        ctx.moveTo(0, i * cellH);
        ctx.lineTo(width, i * cellH);
        ctx.stroke();
      }

      // Draw subtle grid edge wall
      ctx.strokeStyle = status === 'PLAYING' && hasEatenGolden ? '#eab308' : '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 12;
      ctx.shadowColor = status === 'PLAYING' && hasEatenGolden ? '#eab308' : '#00f0ff';
      ctx.strokeRect(0, 0, width, height);
      ctx.shadowBlur = 0; // reset shadow

      // 2. Draw Food with interactive neon pulsing glow
      if (food) {
        ctx.save();
        ctx.beginPath();
        ctx.shadowBlur = 18 + Math.sin(Date.now() * 0.01) * 6; // Pulses glow
        ctx.shadowColor = food.color;
        ctx.fillStyle = food.color;

        const padX = cellW * 0.15;
        const padY = cellH * 0.15;
        const fx = food.x * cellW + cellW / 2;
        const fy = food.y * cellH + cellH / 2;

        if (food.type === 'golden') {
          // Drawing custom glowing gold star
          ctx.beginPath();
          const spikes = 5;
          const outerR = cellW * 0.45;
          const innerR = cellW * 0.2;
          let rot = (Math.PI / 2) * 3;
          let xStar = fx;
          let yStar = fy;
          const stepStar = Math.PI / spikes;

          ctx.moveTo(fx, fy - outerR);
          for (let i = 0; i < spikes; i++) {
            xStar = fx + Math.cos(rot) * outerR;
            yStar = fy + Math.sin(rot) * outerR;
            ctx.lineTo(xStar, yStar);
            rot += stepStar;

            xStar = fx + Math.cos(rot) * innerR;
            yStar = fy + Math.sin(rot) * innerR;
            ctx.lineTo(xStar, yStar);
            rot += stepStar;
          }
          ctx.lineTo(fx, fy - outerR);
          ctx.closePath();
          ctx.fill();
        } else if (food.type === 'double') {
          // Cyber square
          ctx.fillRect(food.x * cellW + padX, food.y * cellH + padY, cellW - padX * 2, cellH - padY * 2);
        } else {
          // Standard circular neon pink core
          ctx.arc(fx, fy, cellW * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // 3. Draw Snake Segment gradients
      ctx.save();
      snake.forEach((segment, idx) => {
        const isHead = idx === 0;
        const sx = segment.x * cellW;
        const sy = segment.y * cellH;

        // Custom flowing cyber gradient (Cyan to Pink)
        const blockPercent = idx / Math.max(1, snake.length - 1);
        const redNum = Math.floor(0 + blockPercent * 255);
        const greenNum = Math.floor(240 - blockPercent * 240);
        const blueNum = 255;
        ctx.fillStyle = `rgb(${redNum}, ${greenNum}, ${blueNum})`;

        ctx.shadowBlur = isHead ? 14 : 4;
        ctx.shadowColor = isHead ? 'rgba(0, 240, 255, 0.8)' : 'rgba(255, 0, 127, 0.4)';

        // Draw rounded parts
        ctx.beginPath();
        const rX = sx + 2;
        const rY = sy + 2;
        const rW = cellW - 4;
        const rH = cellH - 4;
        const radius = isHead ? 6 : 4;

        ctx.roundRect ? ctx.roundRect(rX, rY, rW, rH, radius) : ctx.rect(rX, rY, rW, rH);
        ctx.fill();

        // Draw cute tech visor/glowing eyes on Head
        if (isHead) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000000';
          // Horizontal neon laser visor
          ctx.fillRect(sx + cellW * 0.25, sy + cellH * 0.25, cellW * 0.5, cellH * 0.15);
          ctx.fillStyle = '#ff007f';
          ctx.fillRect(sx + cellW * 0.4, sy + cellH * 0.3, cellW * 0.2, cellH * 0.1);
        }
      });
      ctx.restore();

      // 4. Update and Draw Particle Bursts
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.03;
        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 5. Draw Game over Overlay
      if (status === 'GAMEOVER') {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '800 24px "Orbitron", sans-serif';
        ctx.fillStyle = '#ff007f';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff007f';
        ctx.fillText('CRITICAL OVERFLOW', width / 2, height / 2 - 35);

        ctx.font = '600 12px "Share Tech Mono", monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.shadowBlur = 0;
        ctx.fillText(`SCORE PERSISTED: ${score}`, width / 2, height / 2 + 10);
        ctx.fillText('PRESS SPACE BAR OR RESET TO START', width / 2, height / 2 + 35);
      }

      if (status === 'IDLE') {
        ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.font = '800 22px "Orbitron", sans-serif';
        ctx.fillStyle = '#00f0ff';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f0ff';
        ctx.fillText('GRID INITIALIZED', width / 2, height / 2 - 30);

        ctx.font = '500 12px "Share Tech Mono", monospace';
        ctx.fillStyle = '#e2e8f0';
        ctx.shadowBlur = 0;
        ctx.fillText('CLICK INTRO OR START ARCADE PORTAL', width / 2, height / 2 + 15);
      }

      animeId = requestAnimationFrame(render);
    };

    // First scale
    const handleResize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth * (window.devicePixelRatio || 1);
        canvas.height = parent.clientHeight * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      }
    };
    handleResize();

    window.addEventListener('resize', handleResize);
    animeId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animeId);
    };
  }, [snake, food, status, score, hasEatenGolden]);

  // Space helper to quickly pause / start
  useEffect(() => {
    const handleGlobalSpace = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (status === 'GAMEOVER') {
          resetGame();
        } else if (status === 'PLAYING') {
          setStatus('PAUSED');
        } else if (status === 'PAUSED') {
          setStatus('PLAYING');
        } else if (status === 'IDLE') {
          resetGame();
        }
      }
    };
    window.addEventListener('keydown', handleGlobalSpace);
    return () => window.removeEventListener('keydown', handleGlobalSpace);
  }, [status, score]);

  return (
    <div id="game-console" className="p-5 bg-[#080808] border border-zinc-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md flex flex-col gap-5 relative h-full">
      {/* HUD Bar */}
      <div className="grid grid-cols-3 gap-2 border-b border-zinc-800 pb-3 items-center">
        <div>
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">SCORE CONSOLE</span>
          <span className="text-xl font-mono font-bold text-fuchsia-400 glow-fuchsia flex items-center gap-1">
            <Cpu className="w-4 h-4" /> {String(score).padStart(4, '0')}
          </span>
        </div>

        <div className="text-center bg-black/40 p-1.5 rounded-lg border border-zinc-800/80">
          <span className="text-[9px] font-mono text-zinc-500 block uppercase">MULTIPLIER</span>
          <span className={`text-sm font-bold font-orbitron flex items-center justify-center gap-1 ${multiplier > 1 ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`}>
            <Zap className="w-3.5 h-3.5 fill-amber-400/20" /> x{multiplier}.0
          </span>
        </div>

        <div className="text-right">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block">TOP SCORE</span>
          <span className="text-md sm:text-lg font-mono font-bold text-cyan-400 flex items-center justify-end gap-1">
            <Trophy className="w-3.5 h-3.5 text-amber-500" /> {String(highScores[0]?.score || 1200).padStart(4, '0')}
          </span>
        </div>
      </div>

      {/* Main Sandbox Interactive Field */}
      <div className="relative flex-1 aspect-square w-full rounded-xl overflow-hidden bg-[#030303] border border-zinc-800/80 max-h-[380px] sm:max-h-[440px] shadow-[inset_0_3px_15px_rgba(0,0,0,0.9)]">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />
        
        {/* Neon glitch effect overlay when Golden mode active */}
        {status === 'PLAYING' && hasEatenGolden && (
          <div className="absolute inset-0 bg-yellow-500/5 animate-[pulse_0.1s_infinite] pointer-events-none border border-yellow-500/30" />
        )}
      </div>

      {/* Virtual D-pad controls for mobile and mouse-oriented interactions */}
      <div className="flex justify-between items-center bg-black/40 border border-zinc-800/60 p-3 rounded-xl gap-4">
        {/* Manual control instructions */}
        <div className="hidden md:flex flex-col gap-1.5 text-[10px] font-mono text-zinc-500">
          <span className="text-zinc-400 uppercase tracking-wider font-bold">CONTROLS TERM</span>
          <span>• MOVEMENT: Arrows / WASD Keys</span>
          <span>• GAME TICK RATE: Sync to BPM</span>
          <span>• RESET OR START: Spacebar</span>
          <div className="flex items-center gap-1 mt-1 text-zinc-400 uppercase">
            <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
            <span>SPEED: {activeTrack.bpm} BPM</span>
          </div>
        </div>

        {/* Touch Game pad controls */}
        <div className="flex-1 flex justify-center scale-95 origin-center">
          <div className="grid grid-cols-3 gap-1.5 w-32 relative">
            <div />
            <button 
              onClick={() => handleKeyPress('UP')}
              className="p-1 px-3 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-950/20 rounded font-bold shadow-md cursor-pointer flex items-center justify-center active:bg-cyan-400 active:text-black transition-colors"
              title="Move Up"
            >
              ▲
            </button>
            <div />

            <button 
              onClick={() => handleKeyPress('LEFT')}
              className="p-1 px-3 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-950/20 rounded font-bold shadow-md cursor-pointer flex items-center justify-center active:bg-cyan-400 active:text-black transition-colors"
              title="Move Left"
            >
              ◀
            </button>
            <button 
              onClick={resetGame}
              className="p-1 text-[10px] bg-zinc-900 border border-zinc-750 text-zinc-300 rounded font-semibold flex items-center justify-center cursor-pointer hover:bg-zinc-800"
              title="Reset center grid"
            >
              <RotateCcw className="w-3.5 h-3.5 text-fuchsia-400" />
            </button>
            <button 
              onClick={() => handleKeyPress('RIGHT')}
              className="p-1 px-3 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-950/20 rounded font-bold shadow-md cursor-pointer flex items-center justify-center active:bg-cyan-400 active:text-black transition-colors"
              title="Move Right"
            >
              ▶
            </button>

            <div />
            <button 
              onClick={() => handleKeyPress('DOWN')}
              className="p-1 px-3 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-950/20 rounded font-bold shadow-md cursor-pointer flex items-center justify-center active:bg-cyan-400 active:text-black transition-colors"
              title="Move Down"
            >
              ▼
            </button>
            <div />
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex flex-col gap-2 flex-shrink-0">
          {status === 'PLAYING' ? (
            <button
              onClick={() => {
                setStatus('PAUSED');
                audioEngine.triggerSfx('keypress');
              }}
              className="p-2 sm:px-4 text-xs font-orbitron font-bold text-amber-300 border border-amber-500/40 hover:bg-amber-950/10 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <Pause className="w-3.5 h-3.5 fill-amber-300" />
              <span className="hidden sm:inline">PAUSE GRID</span>
            </button>
          ) : (
            <button
              onClick={status === 'GAMEOVER' || status === 'IDLE' ? resetGame : () => setStatus('PLAYING')}
              className="p-2 sm:px-4 text-xs font-orbitron font-bold text-green-300 border border-green-500/40 hover:bg-green-950/10 rounded-xl flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-green-300" />
              <span>{status === 'GAMEOVER' ? 'RESTART' : 'ENGAGE'}</span>
            </button>
          )}

          <div className="bg-black/35 border border-zinc-800 rounded px-2 py-1 text-center font-mono">
            <span className="text-[8px] text-zinc-500 block uppercase">PILOT LOG</span>
            <input 
              type="text" 
              maxLength={8}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.substring(0,8).toUpperCase())}
              className="w-16 bg-transparent text-[11px] text-zinc-200 outline-none uppercase font-bold text-center border-b border-transparent hover:border-zinc-800 focus:border-cyan-500/50"
              placeholder="PILOT"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
