# Speech MCP Server

A Model Context Protocol server that provides text-to-speech capabilities using the Kokoro TTS model.

## Configuration

The server can be configured using the following environment variables:

| Variable | Description | Default | Valid Range |
|----------|-------------|---------|-------------|
| `MCP_DEFAULT_SPEECH_SPEED` | Default speed multiplier for text-to-speech | 1.1 | 0.5 to 2.0 |
| `MCP_DEFAULT_VOICE` | Default voice for text-to-speech | af_bella | Any valid voice ID |

In Cursor:
```
{
  "mcpServers": {
    "speech": {
      "command": "npx",
      "args": [
        "-y",
        "speech-mcp-server"
      ],
      "env": {
        "MCP_DEFAULT_SPEECH_SPEED": 1.3,
        "MCP_DEFAULT_VOICE": "af_bella"
      }
    }
  }
}
```

## Features

- 🎯 High-quality text-to-speech using Kokoro TTS model
- 🗣️ Multiple voice options available
- 🎛️ Customizable speech parameters (voice, speed)
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

Run the server:

```bash
# Using default configuration
npm start

# With custom configuration
MCP_DEFAULT_SPEECH_SPEED=1.5 MCP_DEFAULT_VOICE=af_bella npm start
```

The server provides the following MCP tools:
- `text_to_speech`: Basic text-to-speech conversion
- `text_to_speech_with_options`: Text-to-speech with customizable speed
- `list_voices`: List all available voices
- `get_model_status`: Check the initialization status of the TTS model

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

### 4. get_model_status
Check the current status of the TTS model initialization. This is particularly useful when first starting the server, as the model needs to be downloaded and initialized.

```json
{
  "type": "request",
  "id": "1",
  "method": "call_tool",
  "params": {
    "name": "get_model_status",
    "arguments": {}
  }
}
```

Response example:
```json
{
  "content": [{
    "type": "text",
    "text": "Model status: initializing (5s elapsed)"
  }]
}
```

Possible status values:
- `uninitialized`: Model initialization hasn't started
- `initializing`: Model is being downloaded and initialized
- `ready`: Model is ready to use
- `error`: An error occurred during initialization

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

## Troubleshooting

### Model Initialization Issues

The server automatically attempts to download and initialize the TTS model on startup. If you encounter initialization errors:

1. The server will automatically retry up to 3 times with a cleanup between attempts
2. Use the `get_model_status` tool to monitor initialization progress and any errors
3. If initialization fails after all retries, try manually removing the model files:

```bash
# Remove model files (MacOS/Linux)
rm -rf ~/.npm/_npx/**/node_modules/@huggingface/transformers/.cache/onnx-community/Kokoro-82M-v1.0-ONNX/onnx/model_quantized.onnx
rm -rf ~/.cache/huggingface/transformers/onnx-community/Kokoro-82M-v1.0-ONNX/onnx/model_quantized.onnx

# Then restart the server
npm start
```

The `get_model_status` tool will now include retry information in its response:
```json
{
  "content": [{
    "type": "text",
    "text": "Model status: initializing (5s elapsed, retry 1/3)"
  }]
}
``` 