import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger('PrismaService');

  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL!,
        },
      },
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'error', 'warn']
          : ['error'],
      errorFormat: 'pretty',
    });
  }

  async onModuleInit() {
    this.logger.log('🔗 Conectando a BD...');
    try {
      await this.$connect();
      this.logger.log(
        `✅ Conectado a BD ${process.env.NODE_ENV === 'development' ? 'SQLite (Desarrollo)' : 'PostgreSQL (Producción)'}`,
      );

      // Health check
      await this.$queryRaw`SELECT 1`;
      this.logger.log('💚 BD healthcheck: OK');
    } catch (err: any) {
      this.logger.error('❌ Error al conectar a BD:', err.message);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Desconectando BD...');
    try {
      await this.$disconnect();
      this.logger.log('✅ BD desconectada correctamente');
    } catch (err: any) {
      this.logger.error('❌ Error al desconectar:', err.message);
    }
  }
}
