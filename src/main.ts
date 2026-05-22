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

  // CORS simple y confiable
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://wallet-frnt-v1.vercel.app',
    ],
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization,Accept',
  });

  await app.listen(process.env.PORT || 3000);
  console.log(
    `[BOOTSTRAP] Servidor escuchando en puerto ${process.env.PORT || 3000}`,
  );
  console.log(
    `[BOOTSTRAP] CORS habilitado para: http://localhost:3000, http://localhost:5173, https://wallet-frnt-v1.vercel.app`,
  );
}
bootstrap();
