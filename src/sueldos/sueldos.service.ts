import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AddSueldoDto } from './dto/add-sueldo.dto';

@Injectable()
export class SueldosService {
  constructor(private prismaService: PrismaService) {}

  async addSueldo(userId: string, addSueldoDto: AddSueldoDto) {
    return this.prismaService.sueldo.create({
      data: {
        monto: addSueldoDto.monto,
        tipo: addSueldoDto.tipo ?? 'SUELDO',
        userId,
      },
    });
  }

  // obtener porcentaje del sueldo usado en gastos
  async getPorcentajeSueldoUsado(userId: string) {
    const ingresos = await this.prismaService.sueldo.aggregate({
      where: { userId },
      _sum: { monto: true },
    });

    const gastos = await this.prismaService.gasto.aggregate({
      // se suman todos los gastos del usuario
      where: { userId },
      _sum: { monto: true },
    });

    if (!ingresos._sum.monto || ingresos._sum.monto === 0) {
      return 0;
    }

    const porcentajeUsado =
      ((gastos._sum.monto || 0) / ingresos._sum.monto) * 100;
    return porcentajeUsado;
  }

  // alertas si se gasta más de x% del sueldo
  /**
   * Verifica si el porcentaje del sueldo usado por un usuario supera un umbral de alerta dado.
   *
   * @param userId - El identificador único del usuario cuyo uso de sueldo se está verificando.
   * @param porcentajeAlerta - El porcentaje de alerta para comparar. Este valor lo define quien llama a la función,
   *   por ejemplo, puedes pasar 80 para verificar si el usuario ha usado más del 80% de su sueldo.
   * @returns Una promesa que resuelve a `true` si el porcentaje usado supera el umbral de alerta, de lo contrario `false`.
   *
   * @example
   * // Verificar si el usuario '123' superó el 80% de uso del sueldo
   * const haSuperado = await checkAlertaPorcentaje('123', 80);
   * if (haSuperado) {
   *   // Disparar alerta
   * }
   */
  async checkAlertaPorcentaje(userId: string, porcentajeAlerta: number) {
    const porcentajeUsado = await this.getPorcentajeSueldoUsado(userId);
    return porcentajeUsado > porcentajeAlerta;
  }

  // cierre mensual (mes cerrado no editable) - devuelve el sueldo y los gastos del mes actual
  async cierreMes(userId: string) {
    // Obtener el mes y año actual
    const now = new Date();
    const mesActual = now.getMonth() + 1; // getMonth() es 0-indexed
    const anioActual = now.getFullYear();

    // busca el sueldo más reciente del mes actual
    const sueldoMes = await this.prismaService.sueldo.findFirst({
      where: {
        userId,
        fecha: {
          gte: new Date(anioActual, mesActual - 1, 1),
          lt: new Date(anioActual, mesActual, 1),
        },
      },
      orderBy: { fecha: 'desc' },
    });

    // busca los gastos del mes actual
    const gastosMes = await this.prismaService.gasto.findMany({
      where: {
        userId,
        fecha: {
          gte: new Date(anioActual, mesActual - 1, 1),
          lt: new Date(anioActual, mesActual, 1),
        },
      },
    });

    return { sueldo: sueldoMes, gastos: gastosMes };
  }

  async getSueldosByUserId(userId: string) {
    return this.prismaService.sueldo.findMany({
      where: { userId },
    });
  }

  async updateSueldo(sueldoId: string, monto: number, tipo?: string) {
    return this.prismaService.sueldo.update({
      where: { id: sueldoId },
      data: { monto, ...(tipo && { tipo }) },
    });
  }

  async deleteSueldo(sueldoId: string) {
    return this.prismaService.sueldo.delete({
      where: { id: sueldoId },
    });
  }
}
