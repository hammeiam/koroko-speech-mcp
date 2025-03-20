#!/usr/bin/env node

// Simple test script to send MCP messages to the server
const child_process = require('child_process');
const path = require('path');

// Start the MCP server as a child process
const server = child_process.spawn('node', ['dist/index.js'], {
  env: {
    ...process.env,
    HF_TOKEN: process.env.HF_TOKEN // Make sure to set this in your environment
  }
});

// Log server output
server.stderr.on('data', (data) => {
  console.error(`Server log: ${data}`);
});

// Example MCP messages
const messages = [
  // List available tools
  {
    type: "request",
    id: "1",
    method: "list_tools",
    params: {}
  },
  // Call text-to-speech
  {
    type: "request",
    id: "2",
    method: "call_tool",
    params: {
      name: "text_to_speech",
      arguments: {
        text: "Hello, this is a test of the text to speech system"
      }
    }
  }
];

// Send messages to server with delay
async function sendMessages() {
  for (const msg of messages) {
    console.log('\nSending message:', msg);
    server.stdin.write(JSON.stringify(msg) + '\n');
    
    // Wait for 2 seconds between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Handle server responses
let buffer = '';
server.stdout.on('data', (data) => {
  buffer += data;
  
  // Split by newlines and process complete messages
  const lines = buffer.split('\n');
  buffer = lines.pop() || ''; // Keep partial line in buffer
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      console.log('\nReceived response:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.error('Error parsing response:', e);
    }
  }
});

// Start sending messages
sendMessages().catch(console.error); 