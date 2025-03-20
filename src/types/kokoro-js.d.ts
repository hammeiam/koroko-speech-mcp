declare module 'kokoro-js' {
  export type KokoroVoice = 
    | "af_bella" | "af_heart" | "af_alloy" | "af_aoede" 
    | "af_jessica" | "af_kore" | "af_nicole" | "af_nova" 
    | "af_river" | "af_sarah" | "af_sky" | "am_adam" 
    | "am_echo" | "am_eric";

  export interface KokoroOptions {
    dtype?: "fp32" | "fp16" | "q8" | "q4" | "q4f16";
  }

  export interface GenerateOptions {
    voice?: KokoroVoice;
  }

  export class Audio {
    save(path: string): Promise<void>;
  }

  export class KokoroTTS {
    static from_pretrained(model_id: string, options?: KokoroOptions): Promise<KokoroTTS>;
    list_voices(): KokoroVoice[];
    generate(text: string, options?: GenerateOptions): Promise<Audio>;
  }
} 