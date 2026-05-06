import { Injectable, BadRequestException } from '@nestjs/common';
import { AddGastoDto } from './dto/add-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GastoService {
  constructor(private prismaService: PrismaService) {}

  async create(userId: string, addGastoDto: AddGastoDto) {
    const monto = addGastoDto.monto;
    const saldo = await this.getSaldo(userId);

    if (saldo === 0) {
      throw new BadRequestException(
        'No tenés sueldo registrado. Registrá un sueldo antes de agregar gastos.',
      );
    }

    // No permitir gasto > saldo (configurable)
    if (monto > saldo) {
      throw new BadRequestException(
        `Saldo insuficiente. Tu saldo disponible es $${saldo.toFixed(2)} y estás intentando gastar $${monto.toFixed(2)}.`,
      );
    }

    return await this.prismaService.gasto.create({
      data: {
        descripcion: addGastoDto.descripcion,
        monto: addGastoDto.monto,
        userId,
      },
    });
  }

  // calcular saldo
  async getSaldo(userId: string) {
    // const ingresos = await this.prismaService.sueldo.aggregate({
    //   where: { userId },
    //   _sum: { monto: true },
    // });
    const ultimoSueldo = await this.prismaService.sueldo.findFirst({
      where: { userId },
      orderBy: { fecha: 'desc' },
    });

    const gastos = await this.prismaService.gasto.aggregate({
      where: { userId },
      _sum: { monto: true },
    });

    return (ultimoSueldo?.monto || 0) - (gastos._sum.monto || 0);
  }

  async findAll() {
    return await this.prismaService.gasto.findMany();
  }

  async findByUser(userId: string) {
    return await this.prismaService.gasto.findMany({
      where: { userId },
      orderBy: { fecha: 'desc' },
    });
  }

  async findOne(id: string) {
    return await this.prismaService.gasto.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateGastoDto: UpdateGastoDto) {
    return await this.prismaService.gasto.update({
      where: { id },
      data: {
        ...updateGastoDto,
      },
    });
  }

  async delete(id: string) {
    return await this.prismaService.gasto.delete({
      where: { id },
    });
  }

  // // gasto recurrente automatico: si hay un gasto que se repite cada mes, se puede configurar para que se cree automaticamente cada mes y que me de un aviso de que ya se va gastanto "mucho dinero en esto"
  // async obtenerGastoRecurrente(id: string) {

  //   const gasto = await this.prismaService.gasto.findUnique({
  //     where: { id },
  //   });

  //   if (!gasto) {
  //     throw new Error('Gasto no encontrado');
  //   }

  //   // Aquí podrías agregar lógica para verificar si el gasto es recurrente y programar su creación automática cada mes
  //   // TO DO: crear tarea programada (cron job) para crear el gasto automáticamente cada mes
  //   // ej alerta para avisar al usuario que se está gastando mucho dinero en este gasto recurrente:

  //   return gasto;
}
