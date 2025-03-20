# Speech MCP Server

A simple MCP (Media Control Protocol) server that converts text to speech using the Orpheus TTS model and plays the generated audio.

## Features

- Text-to-speech conversion using the Orpheus model
- RESTful API endpoint for TTS requests
- Local audio playback
- Input validation
- Health check endpoint

## Prerequisites

- Node.js 18+
- pnpm
- A Hugging Face API token (get one at https://huggingface.co/settings/tokens)

## Installation

```bash
pnpm install
```

## Usage

Add the speech-mcp server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "speech": {
      "command": "npx",
      "args": ["-y", "speech-mcp"],
      "env": {
        "HF_TOKEN": "your_huggingface_token_here"
      }
    }
  }
}
```

### Configuration

The server requires the following environment variables:

- `HF_TOKEN`: Your Hugging Face API token for accessing the Orpheus model

### Available Tools

#### text_to_speech

Converts text to speech and plays it through the system's audio output.

Parameters:
```json
{
  "text": "Text to convert to speech (max 1000 characters)"
}
```

Response:
```json
{
  "content": [{
    "type": "text",
    "text": "Audio played successfully"
  }]
}
```

## Development

Start the development server with hot reload:

```bash
pnpm dev
```

## Build

Compile TypeScript to JavaScript:

```bash
pnpm build
```

## Production

Run the compiled code:

```bash
pnpm start
```

## API Endpoints

### POST /api/tts

Converts text to speech and plays it.

Request body:
```json
{
  "text": "Text to convert to speech"
}
```

Response:
```json
{
  "success": true,
  "message": "Audio played successfully"
}
```

### GET /health

Health check endpoint.

Response:
```json
{
  "status": "ok"
}
```

## Environment Variables

- `PORT`: Server port (default: 3000)

## License

ISC 