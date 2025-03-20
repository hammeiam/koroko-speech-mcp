# Speech MCP Server

A Model Context Protocol (MCP) server for text-to-speech conversion using Kokoro TTS. This server provides high-quality speech synthesis capabilities through a standardized MCP interface.

## Features

- 🎯 High-quality text-to-speech using Kokoro TTS model
- 🗣️ Multiple voice options available
- 🎛️ Customizable speech parameters (speed, pitch)
- 🔌 MCP-compliant interface
- 📦 Easy installation and setup
- 🚀 No API key required

## Installation

```bash
# Using npm
npm install @decodershq/speech-mcp-server

# Using pnpm (recommended)
pnpm add @decodershq/speech-mcp-server

# Using yarn
yarn add @decodershq/speech-mcp-server
```

## Usage

### Starting the Server

```bash
# Using the CLI
mcp-server-speech

# Using node directly
node dist/index.js
```

### Available Tools

The server provides the following tools:

1. `text_to_speech`: Basic text-to-speech conversion
   ```json
   {
     "type": "request",
     "id": "1",
     "method": "call_tool",
     "params": {
       "name": "text_to_speech",
       "arguments": {
         "text": "Hello world",
         "voice": "af_bella"
       }
     }
   }
   ```

2. `text_to_speech_with_options`: Advanced text-to-speech with customization
   ```json
   {
     "type": "request",
     "id": "2",
     "method": "call_tool",
     "params": {
       "name": "text_to_speech_with_options",
       "arguments": {
         "text": "Hello world",
         "voice": "af_bella",
         "speed": 1.0,
         "pitch": 0
       }
     }
   }
   ```

3. `list_voices`: Get available voice options
   ```json
   {
     "type": "request",
     "id": "3",
     "method": "list_voices",
     "params": {}
   }
   ```

### Testing with MCP Inspector

The package includes a debug inspector for testing:

```bash
# Run the inspector in debug mode
pnpm inspector
```

### Development

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build

# Watch mode for development
pnpm dev

# Lint code
pnpm lint

# Format code
pnpm format
```

## Integration with Claude Desktop

To use this server with Claude Desktop, add the following to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "tools": {
    "speech": {
      "command": "node",
      "args": ["/path/to/dist/index.js"]
    }
  }
}
```

## Technical Details

- Built with TypeScript and Node.js
- Uses Kokoro TTS model for speech synthesis
- Implements MCP Server SDK version 1.7.0
- Supports WAV audio output
- Cross-platform compatible

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 