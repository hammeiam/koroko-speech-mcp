#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { pipeline } from '@xenova/transformers';
import { writeFile } from 'fs/promises';
import player from 'node-wav-player';
import { tmpdir } from 'os';
import { join } from 'path';

// Type definitions for tool arguments
interface TextToSpeechArgs {
  text: string;
}

interface TextToSpeechWithOptionsArgs extends TextToSpeechArgs {
  speed?: number;
  pitch?: number;
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

class TTSClient {
  private ttsInstance: any = null;
  private readonly token: string;

  constructor(token: string) {
    this.token = token;

    // Configure global fetch headers for Hugging Face
    const originalFetch = global.fetch;
    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' && input.includes('huggingface.co')) {
        return originalFetch(input, {
          ...init,
          headers: {
            ...init?.headers,
            Authorization: `Bearer ${this.token}`
          }
        });
      }
      return originalFetch(input, init);
    };
  }

  async initTTS(): Promise<void> {
    if (!this.ttsInstance) {
      this.ttsInstance = await pipeline('text-to-speech', 'canopylabs/orpheus-3b-0.1-ft');
    }
  }

  async generateAndPlayAudio(text: string, speed?: number, pitch?: number): Promise<void> {
    if (!this.ttsInstance) {
      await this.initTTS();
    }

    const output = await this.ttsInstance(text);
    const tempFile = join(tmpdir(), `${Date.now()}.wav`);
    await writeFile(tempFile, Buffer.from(output.audio));
    
    await player.play({
      path: tempFile,
      sync: true
    });
  }
}

async function main() {
  const hfToken = process.env.HF_TOKEN;

  if (!hfToken) {
    console.error("Please set HF_TOKEN environment variable");
    process.exit(1);
  }

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

  const ttsClient = new TTSClient(hfToken);

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

            await ttsClient.generateAndPlayAudio(args.text);
            return {
              content: [{ 
                type: "text", 
                text: "Successfully generated and played audio" 
              }],
            };
          }

          case "text_to_speech_with_options": {
            const args = request.params.arguments as unknown as TextToSpeechWithOptionsArgs;
            if (!args.text) {
              throw new Error("Missing required argument: text");
            }

            await ttsClient.generateAndPlayAudio(args.text, args.speed, args.pitch);
            return {
              content: [{ 
                type: "text", 
                text: `Successfully generated and played audio (speed: ${args.speed || 1.0}, pitch: ${args.pitch || 0})` 
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