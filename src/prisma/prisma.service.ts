import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
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

    // Conecta automáticamente al inicializar
    this.$connect()
      .then(() => {
        this.logger.log(
          `✅ Conectado a BD ${process.env.NODE_ENV === 'development' ? 'SQL Server (Desarrollo)' : 'PostgreSQL (Producción)'}`,
        );
      })
      .catch((err) => {
        this.logger.error('❌ Error al conectar a BD:', err.message);
        process.exit(1);
      });
  }

  async onModuleDestroy() {
    this.logger.log('🔌 Desconectando BD...');
    await this.$disconnect();
  }
}
