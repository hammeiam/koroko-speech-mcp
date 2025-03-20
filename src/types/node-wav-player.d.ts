declare module 'node-wav-player' {
  interface PlayOptions {
    path: string;
    sync?: boolean;
  }

  interface WavPlayer {
    play(options: PlayOptions): Promise<void>;
    stop(): Promise<void>;
  }

  const player: WavPlayer;
  export default player;
} 