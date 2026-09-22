import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ForbiddenException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Trust upstream reverse proxy (Nginx) for accurate client IP tracking in Throttler
  app.set('trust proxy', true);

  app.setGlobalPrefix('api', {
    exclude: ['health', 'health/(.*)', 'api/health', 'api/health/(.*)'],
  });

  // Security Headers via Helmet
  // Note: contentSecurityPolicy is disabled here to avoid breaking the React SPA
  // and ensure Swagger UI at /api/docs initializes and renders properly.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Hardened CORS Configuration
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : ['http://localhost'];

  const productionFrontendOrigins = [
    'https://scout-board-git-main-nhat-anh.vercel.app',
    ...configuredOrigins,
  ];

  const devAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ];

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow requests with no origin (e.g. server-to-server, curl, same-origin without Origin header)
      if (!origin) {
        return callback(null, true);
      }
      const allowedList = isProduction
        ? productionFrontendOrigins
        : [...productionFrontendOrigins, ...devAllowedOrigins];

      if (allowedList.includes(origin)) {
        return callback(null, true);
      }
      // Return ForbiddenException so NestJS returns a clean HTTP 403 Forbidden with no Allow-Origin header
      return callback(
        new ForbiddenException(
          `CORS policy does not allow access from origin: ${origin}`,
        ),
        false,
      );
    },
    methods: [
      'GET',
      'HEAD',
      'PUT',
      'PATCH',
      'POST',
      'DELETE',
      'OPTIONS',
      'QUERY',
    ],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    credentials: false,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('ScoutBoard API')
    .setDescription(
      'Football Player Search, Comparison and Squad Building Platform API',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 ScoutBoard Backend running at http://localhost:${port}/api`);
  console.log(
    `📚 Swagger API Docs available at http://localhost:${port}/api/docs`,
  );
}
void bootstrap();
