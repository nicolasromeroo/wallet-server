import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { SueldosController } from './sueldos/sueldos.controller';
import { SueldosModule } from './sueldos/sueldos.module';
import { SueldosService } from './sueldos/sueldos.service';
import { SueldosController } from './sueldos/sueldos.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Hace que ConfigService esté disponible globalmente
    }),
    AuthModule,
    SueldosModule,
  ],
  controllers: [AppController, SueldosController],
  providers: [AppService, SueldosService],
})
export class AppModule {}
