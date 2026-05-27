import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class HistorialService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Archivar mes ─────────────────────────────────────────────────────────
  async archivarMes(userId: string, mes: number, anio: number) {
    const existente = await this.prisma.monthArchive.findUnique({
      where: { userId_mes_anio: { userId, mes, anio } },
    });
    if (existente) {
      throw new ConflictException(
        `El mes ${mes}/${anio} ya fue archivado. Usá /historial/${mes}/${anio} para verlo.`,
      );
    }

    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 0, 23, 59, 59);

    const [gastos, sueldos] = await Promise.all([
      this.prisma.gasto.findMany({
        where: { userId, fecha: { gte: inicio, lte: fin } },
        orderBy: { fecha: 'asc' },
      }),
      this.prisma.sueldo.findMany({
        where: { userId, fecha: { gte: inicio, lte: fin } },
        orderBy: { fecha: 'asc' },
      }),
    ]);

    const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
    const totalSueldos = sueldos.reduce((s, g) => s + g.monto, 0);
    const saldo = totalSueldos - totalGastos;

    return this.prisma.monthArchive.create({
      data: {
        userId,
        mes,
        anio,
        totalGastos,
        totalSueldos,
        saldo,
        gastosJson: JSON.stringify(gastos),
        sueldosJson: JSON.stringify(sueldos),
      },
    });
  }

  // ─── Listar archivos del usuario ──────────────────────────────────────────
  async getHistorial(userId: string) {
    const archivos = await this.prisma.monthArchive.findMany({
      where: { userId },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      select: {
        id: true,
        mes: true,
        anio: true,
        totalGastos: true,
        totalSueldos: true,
        saldo: true,
        archivedAt: true,
      },
    });
    return archivos;
  }

  // ─── Detalle de un mes archivado ──────────────────────────────────────────
  async getArchivoMes(userId: string, mes: number, anio: number) {
    const archivo = await this.prisma.monthArchive.findUnique({
      where: { userId_mes_anio: { userId, mes, anio } },
    });
    if (!archivo) {
      throw new NotFoundException(`No hay archivo para ${mes}/${anio}.`);
    }
    return {
      ...archivo,
      gastos: JSON.parse(archivo.gastosJson),
      sueldos: JSON.parse(archivo.sueldosJson),
    };
  }

  // ─── Exportar a Excel ─────────────────────────────────────────────────────
  async exportarExcel(
    userId: string,
    mes: number,
    anio: number,
    res: Response,
  ) {
    const archivo = await this.prisma.monthArchive.findUnique({
      where: { userId_mes_anio: { userId, mes, anio } },
    });
    if (!archivo) {
      throw new NotFoundException(`No hay archivo para ${mes}/${anio}.`);
    }

    const gastos: Array<{
      descripcion: string;
      monto: number;
      fecha: string;
      categoria?: string;
      esExtraordinario?: boolean;
    }> = JSON.parse(archivo.gastosJson);
    const sueldos: Array<{
      monto: number;
      tipo: string;
      fecha: string;
    }> = JSON.parse(archivo.sueldosJson);

    const MESES = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Wallet App';
    workbook.created = new Date();

    // ── Hoja 1: Gastos ──────────────────────────────────────────────────────
    const hojaGastos = workbook.addWorksheet('Gastos');
    hojaGastos.columns = [
      { header: 'Descripción', key: 'descripcion', width: 35 },
      { header: 'Monto', key: 'monto', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 18 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Extraordinario', key: 'esExtraordinario', width: 16 },
    ];

    // Estilo de encabezados
    hojaGastos.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    gastos.forEach((g) => {
      hojaGastos.addRow({
        descripcion: g.descripcion,
        monto: g.monto,
        fecha: new Date(g.fecha).toLocaleDateString('es-AR'),
        categoria: g.categoria ?? '—',
        esExtraordinario: g.esExtraordinario ? 'Sí' : 'No',
      });
    });

    // Fila de total
    const totalRowGastos = hojaGastos.addRow({
      descripcion: 'TOTAL',
      monto: archivo.totalGastos,
    });
    totalRowGastos.getCell('descripcion').font = { bold: true };
    totalRowGastos.getCell('monto').font = { bold: true };

    // Formato de moneda
    hojaGastos.getColumn('monto').numFmt = '"$"#,##0.00';

    // ── Hoja 2: Ingresos ────────────────────────────────────────────────────
    const hojaIngresos = workbook.addWorksheet('Ingresos');
    hojaIngresos.columns = [
      { header: 'Tipo', key: 'tipo', width: 20 },
      { header: 'Monto', key: 'monto', width: 15 },
      { header: 'Fecha', key: 'fecha', width: 18 },
    ];

    hojaIngresos.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF059669' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    sueldos.forEach((s) => {
      hojaIngresos.addRow({
        tipo: s.tipo,
        monto: s.monto,
        fecha: new Date(s.fecha).toLocaleDateString('es-AR'),
      });
    });

    const totalRowSueldos = hojaIngresos.addRow({
      tipo: 'TOTAL',
      monto: archivo.totalSueldos,
    });
    totalRowSueldos.getCell('tipo').font = { bold: true };
    totalRowSueldos.getCell('monto').font = { bold: true };

    hojaIngresos.getColumn('monto').numFmt = '"$"#,##0.00';

    // ── Hoja 3: Resumen ─────────────────────────────────────────────────────
    const hojaResumen = workbook.addWorksheet('Resumen');
    hojaResumen.getColumn('A').width = 28;
    hojaResumen.getColumn('B').width = 20;

    const nombreMes = MESES[mes - 1];
    hojaResumen.addRow([`Resumen — ${nombreMes} ${anio}`]);
    hojaResumen.getRow(1).getCell(1).font = {
      bold: true,
      size: 14,
      color: { argb: 'FF7C3AED' },
    };
    hojaResumen.addRow([]);
    hojaResumen.addRow(['Total Ingresos', archivo.totalSueldos]);
    hojaResumen.addRow(['Total Gastos', archivo.totalGastos]);
    hojaResumen.addRow(['Saldo', archivo.saldo]);
    hojaResumen.addRow([
      'Archivado el',
      new Date(archivo.archivedAt).toLocaleDateString('es-AR'),
    ]);

    hojaResumen.getColumn('B').numFmt = '"$"#,##0.00';
    const saldoRow = hojaResumen.getRow(5);
    saldoRow.getCell(2).font = {
      bold: true,
      color: { argb: archivo.saldo >= 0 ? 'FF059669' : 'FFDC2626' },
    };

    // ── Stream response ──────────────────────────────────────────────────────
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="wallet-${MESES[mes - 1].toLowerCase()}-${anio}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  // ─── Eliminar archivo ─────────────────────────────────────────────────────
  async eliminarArchivo(userId: string, mes: number, anio: number) {
    const archivo = await this.prisma.monthArchive.findUnique({
      where: { userId_mes_anio: { userId, mes, anio } },
    });
    if (!archivo) {
      throw new NotFoundException(`No hay archivo para ${mes}/${anio}.`);
    }
    await this.prisma.monthArchive.delete({
      where: { userId_mes_anio: { userId, mes, anio } },
    });
    return { ok: true };
  }

  // ─── Editar archivo manualmente ───────────────────────────────────────────
  async editarArchivo(
    userId: string,
    mes: number,
    anio: number,
    dto: { nota?: string; totalGastos?: number; totalSueldos?: number },
  ) {
    const archivo = await this.prisma.monthArchive.findUnique({
      where: { userId_mes_anio: { userId, mes, anio } },
    });
    if (!archivo) {
      throw new NotFoundException(`No hay archivo para ${mes}/${anio}.`);
    }

    const totalGastos = dto.totalGastos ?? archivo.totalGastos;
    const totalSueldos = dto.totalSueldos ?? archivo.totalSueldos;
    const saldo = totalSueldos - totalGastos;

    return this.prisma.monthArchive.update({
      where: { userId_mes_anio: { userId, mes, anio } },
      data: {
        ...(dto.nota !== undefined && { nota: dto.nota }),
        totalGastos,
        totalSueldos,
        saldo,
      },
    });
  }

  // ─── Cron: archivar mes anterior el día 1 de cada mes ────────────────────
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async autoArchivarMesAnterior() {
    const now = new Date();
    // El día 1 de este mes → el mes anterior
    const fechaAnterior = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mes = fechaAnterior.getMonth() + 1;
    const anio = fechaAnterior.getFullYear();

    // Obtener todos los usuarios que tuvieron actividad ese mes
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 0, 23, 59, 59);

    const usuariosConGastos = await this.prisma.gasto.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const usuariosConSueldos = await this.prisma.sueldo.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      select: { userId: true },
      distinct: ['userId'],
    });

    const userIds = [
      ...new Set([
        ...usuariosConGastos.map((u) => u.userId),
        ...usuariosConSueldos.map((u) => u.userId),
      ]),
    ];

    for (const userId of userIds) {
      try {
        await this.archivarMes(userId, mes, anio);
      } catch {
        // Si ya fue archivado manualmente, lo ignoramos
      }
    }
  }
}
