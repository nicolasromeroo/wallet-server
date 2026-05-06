import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class NotesService {
  constructor(private prismaService: PrismaService) {}

  async create(userId: string, createNoteDto: CreateNoteDto) {
    return await this.prismaService.note.create({
      data: {
        title: createNoteDto.title,
        description: createNoteDto.description,
        userId,
        sueldoId: createNoteDto.sueldoId ?? null,
        ...(createNoteDto.gastoId && {
          gasto: { connect: { id: createNoteDto.gastoId } },
        }),
      },
      include: { gasto: true, sueldo: true },
    });
  }

  async findAll(userId: string) {
    return await this.prismaService.note.findMany({
      where: { userId },
      include: { gasto: true, sueldo: true },
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number, userId: string) {
    const note = await this.prismaService.note.findFirst({
      where: { id, userId },
      include: { gasto: true, sueldo: true },
    });
    if (!note) throw new NotFoundException('Nota no encontrada');
    return note;
  }

  async update(id: number, userId: string, updateNoteDto: UpdateNoteDto) {
    await this.findOne(id, userId);

    const gastoUpdate =
      updateNoteDto.gastoId === null
        ? { gasto: { disconnect: true } }
        : updateNoteDto.gastoId
          ? { gasto: { connect: { id: updateNoteDto.gastoId } } }
          : {};

    return await this.prismaService.note.update({
      where: { id },
      data: {
        ...(updateNoteDto.title && { title: updateNoteDto.title }),
        ...(updateNoteDto.description !== undefined && {
          description: updateNoteDto.description,
        }),
        ...(updateNoteDto.sueldoId !== undefined && {
          sueldoId: updateNoteDto.sueldoId,
        }),
        ...gastoUpdate,
      },
      include: { gasto: true, sueldo: true },
    });
  }

  async remove(id: number, userId: string) {
    await this.findOne(id, userId);
    return await this.prismaService.note.delete({ where: { id } });
  }
}
