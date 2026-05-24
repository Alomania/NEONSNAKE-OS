export interface Track {
  id: string;
  title: string;
  genre: string;
  bpm: number;
  description: string;
  duration: string;
  color: string; // Tailwind neon color border/text
  glowColor: string; // RGB values for shadow glow
}

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Position {
  x: number;
  y: number;
}

export interface Food {
  x: number;
  y: number;
  type: 'standard' | 'double' | 'golden';
  points: number;
  color: string;
  glow: string;
}

export type GameStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export interface HighScore {
  name: string;
  score: number;
  date: string;
  trackName: string;
}
