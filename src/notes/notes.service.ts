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
        gastoId: createNoteDto.gastoId ?? null,
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

  async findOne(id: string, userId: string) {
    const note = await this.prismaService.note.findFirst({
      where: { id: parseInt(id), userId },
      include: { gasto: true, sueldo: true },
    });
    if (!note) throw new NotFoundException('Nota no encontrada');
    return note;
  }

  async update(id: string, userId: string, updateNoteDto: UpdateNoteDto) {
    await this.findOne(id, userId);

    return await this.prismaService.note.update({
      where: { id: parseInt(id) },
      data: {
        ...(updateNoteDto.title && { title: updateNoteDto.title }),
        ...(updateNoteDto.description && {
          description: updateNoteDto.description,
        }),
        ...(updateNoteDto.sueldoId !== undefined && {
          sueldoId: updateNoteDto.sueldoId,
        }),
        ...(updateNoteDto.gastoId !== undefined && {
          gastoId: updateNoteDto.gastoId,
        }),
      },
      include: { gasto: true, sueldo: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    return await this.prismaService.note.delete({
      where: { id: parseInt(id) },
    });
  }
}
