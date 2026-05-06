import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrainingExample, CATEGORIES } from '../types/ml.types';

/**
 * Dataset Service
 * Responsabilidad: obtener datos desde Prisma y prepararlos como ejemplos de entrenamiento.
 * Es la única capa del módulo ML que toca la base de datos directamente.
 */
@Injectable()
export class DatasetService {
  constructor(private readonly prisma: PrismaService) {}

  async getGastos(userId?: string) {
    return this.prisma.gasto.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { fecha: 'desc' },
    });
  }

  async getSueldos(userId?: string) {
    return this.prisma.sueldo.findMany({
      where: userId ? { userId } : undefined,
      orderBy: { fecha: 'desc' },
    });
  }

  /** Devuelve solo los gastos que ya tienen categoría asignada (etiquetados para entrenamiento) */
  async getTrainingExamples(): Promise<TrainingExample[]> {
    const gastos = await this.prisma.gasto.findMany({
      where: {
        categoria: { in: CATEGORIES as string[], not: null },
      },
    });

    return gastos.map((g) => ({
      description: g.descripcion,
      monto: g.monto,
      categoria: (g.categoria ?? 'OTROS') as TrainingExample['categoria'],
    }));
  }

  async getGastosPorMes(userId: string, mes: number, anio: number) {
    const start = new Date(anio, mes - 1, 1);
    const end = new Date(anio, mes, 0, 23, 59, 59);
    return this.prisma.gasto.findMany({
      where: { userId, fecha: { gte: start, lte: end } },
      orderBy: { fecha: 'asc' },
    });
  }

  async getUltimoSueldo(userId: string) {
    return this.prisma.sueldo.findFirst({
      where: { userId },
      orderBy: { fecha: 'desc' },
    });
  }
}
