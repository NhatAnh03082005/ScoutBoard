import 'reflect-metadata';
import * as path from 'path';

// Intercept 'src/' alias imports if any exist at runtime
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
const backendRoot = path.resolve(__dirname, '..');

Module._resolveFilename = function (request: string, parent: any, isMain: boolean, options: any) {
  if (request.startsWith('src/')) {
    const candidate = path.join(backendRoot, 'dist', request);
    return originalResolveFilename.call(this, candidate, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const server: Express = express();
let isReady = false;
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  const { AppModule } = require('../dist/src/app.module');
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'api/health', 'api/health/(.*)'],
  });

  // Enable CORS
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS', 'QUERY'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('ScoutBoard API')
    .setDescription('Football Player Search, Comparison and Squad Building Platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.init();
  isReady = true;
}

export default async function handler(req: Request, res: Response) {
  const origin = (req.headers.origin as string) || 'https://scout-board-three.vercel.app';

  // Instant response for CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With, X-Api-Version');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.statusCode = 204;
    res.end();
    return;
  }

  // Ensure CORS headers on all responses
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  try {
    if (!isReady) {
      if (!bootstrapPromise) {
        bootstrapPromise = bootstrap();
      }
      await bootstrapPromise;
    }
    server(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Function Error]:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        statusCode: 500,
        message: 'Serverless initialization error',
        error: err?.message || String(err),
        details: err?.stack,
      }),
    );
  }
}
