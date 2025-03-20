#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { KokoroTTS, KokoroVoice } from "kokoro-js";
import player from 'node-wav-player';
import { tmpdir } from 'os';
import { join } from 'path';

// Type definitions for tool arguments
interface TextToSpeechArgs {
  text: string;
  voice?: KokoroVoice;
}

interface TextToSpeechWithOptionsArgs extends TextToSpeechArgs {
  speed?: number;
  pitch?: number;
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
  description: "Convert text to speech with customizable speed and pitch",
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
      pitch: {
        type: "number",
        description: "Voice pitch adjustment (-20 to +20)",
        minimum: -20,
        maximum: 20,
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

class TTSClient {
  private ttsInstance: KokoroTTS | null = null;
  private readonly modelId = "onnx-community/Kokoro-82M-ONNX";

  constructor() {
    // No token needed for Kokoro
  }

  async initTTS(): Promise<void> {
    if (!this.ttsInstance) {
      this.ttsInstance = await KokoroTTS.from_pretrained(this.modelId, {
        dtype: "q8", // Use quantized model for better performance
      });
    }
  }

  async listVoices(): Promise<KokoroVoice[]> {
    if (!this.ttsInstance) {
      await this.initTTS();
    }
    return this.ttsInstance!.list_voices();
  }

  async generateAndPlayAudio(text: string, voice?: KokoroVoice, speed?: number, pitch?: number): Promise<void> {
    if (!this.ttsInstance) {
      await this.initTTS();
    }

    const audio = await this.ttsInstance!.generate(text, {
      voice: voice || "af_bella", // Default voice
      // TODO: Implement speed and pitch when supported by kokoro-js
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

  // Pre-initialize TTS model
  await ttsClient.initTTS();
  console.error("TTS model initialized successfully");

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

            await ttsClient.generateAndPlayAudio(args.text, args.voice, args.speed, args.pitch);
            return {
              content: [{ 
                type: "text", 
                text: `Successfully generated and played audio${args.voice ? ` using voice: ${args.voice}` : ''} (speed: ${args.speed || 1.0}, pitch: ${args.pitch || 0})` 
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