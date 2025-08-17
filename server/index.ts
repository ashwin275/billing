#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start Vite dev server for the frontend with Replit configuration
const viteProcess = spawn('npx', [
  'vite', 
  '--config', 'vite.config.dev.ts',
  '--host', '0.0.0.0',
  '--port', '5000'
], {
  cwd: resolve(__dirname, '..'),
  stdio: 'inherit'
});

viteProcess.on('error', (error) => {
  console.error('Failed to start Vite:', error);
  process.exit(1);
});

viteProcess.on('close', (code) => {
  console.log(`Vite process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  viteProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  viteProcess.kill('SIGTERM');
});