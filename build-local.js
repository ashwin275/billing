#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building for local deployment...');

try {
  // Clean dist directory
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
    console.log('✅ Cleaned dist directory');
  }

  // Build using Netlify config
  console.log('📦 Building with Vite...');
  execSync('npx vite build -c vite.config.netlify.ts', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });

  console.log('✅ Build completed successfully!');
  console.log('📁 Files are in the "dist" directory');
  console.log('🌐 You can now deploy the "dist" folder to Netlify');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}