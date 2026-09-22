import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

const server: Express = express();
let isReady = false;
let bootstrapPromise: Promise<void> | null = null;

async function bootstrap() {
  const { AppModule } = await import('../src/app.module');
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
    res.status(204).end();
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
    res.status(500).json({
      statusCode: 500,
      message: 'Serverless initialization error',
      error: err?.message || String(err),
      details: err?.stack,
    });
  }
}
