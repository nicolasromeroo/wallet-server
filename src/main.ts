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

  // CORS
  app.enableCors();

  await app.listen(3000);
}
bootstrap();
