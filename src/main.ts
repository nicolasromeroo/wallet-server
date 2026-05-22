import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // propiedades no definidas en el DTO
      forbidNonWhitelisted: true,
      transform: true, // tipos automáticamente
    }),
  );

  // CORS — permitir Vercel + localhost (robusta)
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://wallet-frnt-v1.vercel.app',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir localhost sin origin header (requests desde herramientas)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS blocked'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
    maxAge: 86400,
    exposedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  });

  await app.listen(process.env.PORT || 3000);
  console.log(
    `[BOOTSTRAP] Servidor escuchando en puerto ${process.env.PORT || 3000}`,
  );
  console.log(`[BOOTSTRAP] CORS habilitado para: ${allowedOrigins.join(', ')}`);
}
bootstrap();
