#!/usr/bin/env node

import dotenv from 'dotenv';
import express from 'express';
import { setupA2ARoutes } from './routes.js';
import pkg from '../package.json' with { type: 'json' };

// Load .env file if present
dotenv.config();

const HOST = process.env.HOST || '0.0.0.0';
const PORT = parseInt(process.env.PORT || '2528', 10);

// Check for required ANTHROPIC_API_KEY
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

const app = express();

// Simple request logging
app.use(express.json());
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Setup A2A routes
setupA2ARoutes(app, HOST, PORT);

app.listen(PORT, HOST, () => {
  console.log(`${pkg.name} v${pkg.version}`);
  console.log(`running on: http://${HOST}:${PORT}`);
}).on('error', (err) => {
  console.error(err);
  process.exit(1);
});
