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

  /**
   * Para PostgreSQL en hosting gratuito (límite bajo de conexiones),
   * forzamos connection_limit=1 si no viene ya en la URL.
   * Esto serializa las queries a través de UNA sola conexión,
   * evitando el error P2037 "too many connections".
   */
  private static buildDatabaseUrl(): string {
    const url = process.env.DATABASE_URL ?? '';
    if (!url || url.startsWith('file:')) return url; // SQLite: sin cambios
    try {
      const parsed = new URL(url);
      if (!parsed.searchParams.has('connection_limit')) {
        parsed.searchParams.set('connection_limit', '1');
      }
      if (!parsed.searchParams.has('pool_timeout')) {
        parsed.searchParams.set('pool_timeout', '30');
      }
      return parsed.toString();
    } catch {
      return url;
    }
  }

  constructor() {
    super({
      datasources: {
        db: {
          url: PrismaService.buildDatabaseUrl(),
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
