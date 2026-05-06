import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IGastoRepository,
  CreateGastoInput,
  UpdateGastoInput,
} from './gasto.repository.interface';
import { Gasto } from '@prisma/client';

// Implementación concreta con Prisma
// Los Handlers solo conocen IGastoRepository, no Prisma. Esto es para facilitar el cambio de ORM o la implementación de tests unitarios con mocks. Entonces:
// repository interface -> es el encargado de definir el contrato, lo que se espera de un repositorio de gastos
// repository implementation -> es la implementación concreta de ese contrato, en este caso usando Prisma

// esta es la logica que antes estaba en el service, ahora esta en el repository. El service se encarga de la logica de negocio, y el repository se encarga de la logica de acceso a datos.

// Entonces el service llama al repository para obtener los datos y orquesta, y el repository se encarga de interactuar con la base de datos. Esto es para separar las responsabilidades y hacer el codigo mas mantenible y testable.
@Injectable()
export class GastoRepository implements IGastoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateGastoInput): Promise<Gasto> {
    return this.prisma.gasto.create({ data: input });
  }

  async update(id: string, input: UpdateGastoInput): Promise<Gasto> {
    return this.prisma.gasto.update({ where: { id }, data: input });
  }

  async findById(id: string): Promise<Gasto | null> {
    return this.prisma.gasto.findUnique({ where: { id } });
  }

  async findByUser(userId: string): Promise<Gasto[]> {
    return this.prisma.gasto.findMany({
      where: { userId },
      orderBy: { fecha: 'desc' },
    });
  }

  async findByUserAndMonth(
    userId: string,
    mes: number,
    anio: number,
  ): Promise<Gasto[]> {
    return this.prisma.gasto.findMany({
      where: {
        userId,
        fecha: {
          gte: new Date(anio, mes - 1, 1),
          lt: new Date(anio, mes, 1),
        },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async getSumByUser(userId: string): Promise<number> {
    const result = await this.prisma.gasto.aggregate({
      where: { userId },
      _sum: { monto: true },
    });
    return result._sum.monto ?? 0;
  }

  async getSumByUserAndMonth(
    userId: string,
    mes: number,
    anio: number,
  ): Promise<number> {
    const result = await this.prisma.gasto.aggregate({
      where: {
        userId,
        fecha: {
          gte: new Date(anio, mes - 1, 1),
          lt: new Date(anio, mes, 1),
        },
      },
      _sum: { monto: true },
    });
    return result._sum.monto ?? 0;
  }

  async delete(id: string): Promise<Gasto> {
    return this.prisma.gasto.delete({ where: { id } });
  }

  async checkGastoExcesivo(userId: string, monto: number): Promise<boolean> {
    const totalGastos = await this.getSumByUser(userId);
    return totalGastos + monto > 35000; // Ejemplo: si el total de gastos supera los 35000, consideramos que es excesivo
  }
}
