#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { rm } from 'fs/promises';
import { KokoroTTS, KokoroVoice } from "kokoro-js";
import player from 'node-wav-player';
import { homedir, tmpdir } from 'os';
import { join } from 'path';

// Configuration from environment variables
const DEFAULT_SPEECH_SPEED = parseFloat(process.env.MCP_DEFAULT_SPEECH_SPEED || "1.1");
if (isNaN(DEFAULT_SPEECH_SPEED) || DEFAULT_SPEECH_SPEED < 0.5 || DEFAULT_SPEECH_SPEED > 2.0) {
  throw new Error("MCP_DEFAULT_SPEECH_SPEED must be a number between 0.5 and 2.0");
}

const DEFAULT_VOICE = (process.env.MCP_DEFAULT_VOICE || "af_bella") as KokoroVoice;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Type definitions for tool arguments
interface TextToSpeechArgs {
  text: string;
  voice?: KokoroVoice;
}

interface TextToSpeechWithOptionsArgs extends TextToSpeechArgs {
  speed?: number;
  voice?: KokoroVoice;
}

// Tool definitions
const textToSpeechTool: Tool = {
  name: "text_to_speech",
  description: "Convert text to speech and play it through system audio",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text to convert to speech",
        minLength: 1,
        maxLength: 1000,
      },
      voice: {
        type: "string",
        description: "The voice to use for speech synthesis (e.g. 'af_bella'). Use list_voices to see available options.",
      },
    },
    required: ["text"],
  },
};

const textToSpeechWithOptionsTool: Tool = {
  name: "text_to_speech_with_options",
  description: "Convert text to speech with customizable speed",
  inputSchema: {
    type: "object",
    properties: {
      text: {
        type: "string",
        description: "The text to convert to speech",
        minLength: 1,
        maxLength: 1000,
      },
      voice: {
        type: "string",
        description: "The voice to use for speech synthesis (e.g. 'af_bella'). Use list_voices to see available options.",
      },
      speed: {
        type: "number",
        description: "Speech rate multiplier (0.5 to 2.0)",
        minimum: 0.5,
        maximum: 2.0,
      },
    },
    required: ["text"],
  },
};

const listVoicesTool: Tool = {
  name: "list_voices",
  description: "List all available voices for text-to-speech",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

const getModelStatusTool: Tool = {
  name: "get_model_status",
  description: "Get the current status of the TTS model initialization",
  inputSchema: {
    type: "object",
    properties: {},
    required: [],
  },
};

class TTSClient {
  private ttsInstance: KokoroTTS | null = null;
  private readonly modelId = "onnx-community/Kokoro-82M-v1.0-ONNX";
  private initializationPromise: Promise<void> | null = null;
  private initializationError: Error | null = null;
  private initializationStartTime: number | null = null;
  private retryCount: number = 0;

  constructor() {
    // Start initialization immediately but don't block
    this.startInitialization();
  }

  private async cleanupModelFiles(): Promise<void> {
    const modelPaths = [
      join(homedir(), '.npm', '_npx', '**', 'node_modules', '@huggingface', 'transformers', '.cache', 'onnx-community', 'Kokoro-82M-v1.0-ONNX', 'onnx', 'model_quantized.onnx'),
      join(homedir(), '.cache', 'huggingface', 'transformers', 'onnx-community', 'Kokoro-82M-v1.0-ONNX', 'onnx', 'model_quantized.onnx')
    ];

    for (const path of modelPaths) {
      try {
        await rm(path, { force: true });
        console.error(`Cleaned up model file at ${path}`);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async startInitialization(): Promise<void> {
    if (this.initializationPromise) return;
    
    this.initializationStartTime = Date.now();
    this.initializationPromise = this.initializeWithRetry();
  }

  private async initializeWithRetry(): Promise<void> {
    while (this.retryCount < MAX_RETRIES) {
      try {
        if (this.retryCount > 0) {
          console.error(`Retrying model initialization (attempt ${this.retryCount + 1}/${MAX_RETRIES})...`);
          await this.cleanupModelFiles();
          await this.delay(RETRY_DELAY_MS);
        }

        this.ttsInstance = await KokoroTTS.from_pretrained(this.modelId, {
          dtype: "q8",
        });
        return;
      } catch (error) {
        this.retryCount++;
        const isLastAttempt = this.retryCount >= MAX_RETRIES;
        
        if (error instanceof Error) {
          const errorMessage = `Model initialization failed${isLastAttempt ? ' (final attempt)' : ''}: ${error.message}`;
          console.error(errorMessage);
          
          if (isLastAttempt) {
            this.initializationError = new Error(
              `Failed to initialize model after ${MAX_RETRIES} attempts. ` +
              `Last error: ${error.message}\n` +
              `Try manually removing the model file and running again.`
            );
            throw this.initializationError;
          }
        }
      }
    }
  }

  async getStatus(): Promise<{
    status: 'uninitialized' | 'initializing' | 'ready' | 'error';
    elapsedMs?: number;
    error?: string;
    retryCount?: number;
  }> {
    if (!this.initializationPromise) {
      return { status: 'uninitialized' };
    }
    if (this.initializationError) {
      return { 
        status: 'error',
        error: this.initializationError.message,
        retryCount: this.retryCount
      };
    }
    if (!this.ttsInstance) {
      return { 
        status: 'initializing',
        elapsedMs: Date.now() - (this.initializationStartTime || 0),
        retryCount: this.retryCount
      };
    }
    return { 
      status: 'ready',
      retryCount: this.retryCount
    };
  }

  async waitForInit(): Promise<void> {
    if (!this.initializationPromise) {
      this.startInitialization();
    }
    await this.initializationPromise;
  }

  async listVoices(): Promise<KokoroVoice[]> {
    await this.waitForInit();
    if (!this.ttsInstance) {
      throw new Error("TTS model not initialized");
    }
    // @ts-ignore-line
    const allVoices = this.ttsInstance.voices as unknown as {[voice: string]: {overallGrade: string; gender: string}};
    const goodVoices = Object.keys(allVoices)
      .filter((voiceName) => ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+'].includes(allVoices[voiceName].overallGrade))
    return goodVoices as unknown as KokoroVoice[];
  }

  async generateAndPlayAudio(text: string, voice?: KokoroVoice, speed?: number): Promise<void> {
    await this.waitForInit();
    if (!this.ttsInstance) {
      throw new Error("TTS model not initialized");
    }

    const audio = await this.ttsInstance.generate(text, {
      voice: voice || DEFAULT_VOICE,
      // @ts-ignore-line
      speed: speed || DEFAULT_SPEECH_SPEED,
    });

    const tempFile = join(tmpdir(), `${Date.now()}.wav`);
    await audio.save(tempFile);
    
    await player.play({
      path: tempFile,
      sync: true
    });
  }
}

async function main() {
  console.error("Starting Speech MCP Server...");

  const server = new Server(
    {
      name: "Speech MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const ttsClient = new TTSClient();

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      console.error("Received CallToolRequest:", request);
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        switch (request.params.name) {
          case "text_to_speech": {
            const args = request.params.arguments as unknown as TextToSpeechArgs;
            if (!args.text) {
              throw new Error("Missing required argument: text");
            }

            await ttsClient.generateAndPlayAudio(args.text, args.voice);
            return {
              content: [{ 
                type: "text", 
                text: `Successfully generated and played audio${args.voice ? ` using voice: ${args.voice}` : ''}` 
              }],
            };
          }

          case "text_to_speech_with_options": {
            const args = request.params.arguments as unknown as TextToSpeechWithOptionsArgs;
            if (!args.text) {
              throw new Error("Missing required argument: text");
            }

            await ttsClient.generateAndPlayAudio(args.text, args.voice, args.speed);
            return {
              content: [{ 
                type: "text", 
                text: `Successfully generated and played audio${args.voice ? ` using voice: ${args.voice}` : ''} (speed: ${args.speed || 1.0})` 
              }],
            };
          }

          case "list_voices": {
            const voices = await ttsClient.listVoices();
            return {
              content: [{ 
                type: "text", 
                text: `Available voices:\n${voices.join('\n')}` 
              }],
            };
          }

          case "get_model_status": {
            const status = await ttsClient.getStatus();
            let message = `Model status: ${status.status}`;
            if (status.elapsedMs) {
              message += ` (${Math.round(status.elapsedMs / 1000)}s elapsed)`;
            }
            if (status.error) {
              message += `\nError: ${status.error}`;
            }
            return {
              content: [{ type: "text", text: message }],
            };
          }

          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error("Received ListToolsRequest");
    return {
      tools: [
        textToSpeechTool,
        textToSpeechWithOptionsTool,
        listVoicesTool,
        getModelStatusTool,
      ],
    };
  });

  const transport = new StdioServerTransport();
  console.error("Connecting server to transport...");
  await server.connect(transport);
  console.error("Speech MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
}); 