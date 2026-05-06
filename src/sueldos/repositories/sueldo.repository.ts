import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Sueldo } from '@prisma/client';

@Injectable()
export class SueldoRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Retorna el sueldo más reciente del usuario (el vigente)
  async findActual(userId: string): Promise<Sueldo | null> {
    return this.prisma.sueldo.findFirst({
      where: { userId },
      orderBy: { fecha: 'desc' },
    });
  }

  async create(userId: string, monto: number): Promise<Sueldo> {
    return this.prisma.sueldo.create({ data: { userId, monto } });
  }

  async findAll(userId: string): Promise<Sueldo[]> {
    return this.prisma.sueldo.findMany({
      where: { userId },
      orderBy: { fecha: 'desc' },
    });
  }

  async getSumByMonth(
    userId: string,
    mes: number,
    anio: number,
  ): Promise<number> {
    const startDate = new Date(anio, mes - 1, 1);
    const endDate = new Date(anio, mes, 1);
    const result = await this.prisma.sueldo.aggregate({
      where: {
        userId,
        fecha: { gte: startDate, lt: endDate },
      },
      _sum: { monto: true },
    });
    return result._sum.monto ?? 0;
  }
}
