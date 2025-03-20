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
npm install speech-mcp-server

# Using pnpm (recommended)
pnpm add speech-mcp-server

# Using yarn
yarn add speech-mcp-server
```

## Usage

### Running the Server

```bash
# Using npx
npx speech-mcp-server

# Or if installed globally
mcp-server-speech
```

### Development

```bash
# Clone the repository
git clone <your-repo-url>
cd speech-mcp-server

# Install dependencies
pnpm install

# Start development server with auto-reload
pnpm dev

# Build the project
pnpm build

# Run linting
pnpm lint

# Format code
pnpm format

# Test with MCP Inspector
pnpm inspector
```

## Available Tools

### 1. text_to_speech
Converts text to speech using the default settings.

```json
{
  "type": "request",
  "id": "1",
  "method": "call_tool",
  "params": {
    "name": "text_to_speech",
    "arguments": {
      "text": "Hello world",
      "voice": "af_bella"  // optional
    }
  }
}
```

### 2. text_to_speech_with_options
Converts text to speech with customizable parameters.

```json
{
  "type": "request",
  "id": "1",
  "method": "call_tool",
  "params": {
    "name": "text_to_speech_with_options",
    "arguments": {
      "text": "Hello world",
      "voice": "af_bella",  // optional
      "speed": 1.0,         // optional (0.5 to 2.0)
      "pitch": 0            // optional (-20 to +20)
    }
  }
}
```

### 3. list_voices
Lists all available voices for text-to-speech.

```json
{
  "type": "request",
  "id": "1",
  "method": "list_voices",
  "params": {}
}
```

## Testing

You can test the server using the MCP Inspector or by sending raw JSON messages:

```bash
# List available tools
echo '{"type":"request","id":"1","method":"list_tools","params":{}}' | node dist/index.js

# List available voices
echo '{"type":"request","id":"2","method":"list_voices","params":{}}' | node dist/index.js

# Convert text to speech
echo '{"type":"request","id":"3","method":"call_tool","params":{"name":"text_to_speech","arguments":{"text":"Hello world","voice":"af_bella"}}}' | node dist/index.js
```

## Integration with Claude Desktop

To use this server with Claude Desktop, add the following to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "servers": {
    "speech": {
      "command": "npx",
      "args": ["@decodershq/speech-mcp-server"]
    }
  }
}
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details. 