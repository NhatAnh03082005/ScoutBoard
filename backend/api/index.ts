import 'reflect-metadata';
import * as path from 'path';
import express, { Express, Request, Response } from 'express';

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

const server: Express = express();
let isReady = false;
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  const { NestFactory } = require('@nestjs/core');
  const { ExpressAdapter } = require('@nestjs/platform-express');
  const { ValidationPipe } = require('@nestjs/common');
  const { DocumentBuilder, SwaggerModule } = require('@nestjs/swagger');
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

  if (req.url && (req.url.includes('debug-probe') || req.url === '/debug')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    const fs = require('fs');
    res.end(
      JSON.stringify({
        __dirname,
        cwd: process.cwd(),
        url: req.url,
        distInCwd: fs.existsSync(path.join(process.cwd(), 'dist')),
        distFromDirname: fs.existsSync(path.resolve(__dirname, '../dist')),
        filesInCwd: fs.existsSync(process.cwd()) ? fs.readdirSync(process.cwd()) : [],
        postgresHost: process.env.POSTGRES_HOST || 'MISSING',
        postgresDb: process.env.POSTGRES_DB || 'MISSING',
        postgresUser: process.env.POSTGRES_USER || 'MISSING',
        postgresSsl: process.env.POSTGRES_SSL || 'MISSING',
        jwtSecretLen: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
        nodeEnv: process.env.NODE_ENV || 'MISSING',
      }),
    );
    return;
  }

  try {
    if (!isReady) {
      if (!bootstrapPromise) {
        bootstrapPromise = bootstrap();
      }
      await bootstrapPromise;
    }

    await new Promise<void>((resolve, reject) => {
      res.on('finish', () => resolve());
      res.on('close', () => resolve());
      res.on('error', (err) => reject(err));
      server(req, res, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
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
