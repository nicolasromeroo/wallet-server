import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { HistorialService } from './historial.service';

@UseGuards(JwtGuard)
@Controller('historial')
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  // POST /historial/archivar/:mes/:anio
  @Post('archivar/:mes/:anio')
  archivarMes(
    @Req() req: Request & { user: { id: string } },
    @Param('mes', ParseIntPipe) mes: number,
    @Param('anio', ParseIntPipe) anio: number,
  ) {
    return this.historialService.archivarMes(req.user.id, mes, anio);
  }

  // GET /historial
  @Get()
  getHistorial(@Req() req: Request & { user: { id: string } }) {
    return this.historialService.getHistorial(req.user.id);
  }

  // GET /historial/:mes/:anio
  @Get(':mes/:anio')
  getArchivoMes(
    @Req() req: Request & { user: { id: string } },
    @Param('mes', ParseIntPipe) mes: number,
    @Param('anio', ParseIntPipe) anio: number,
  ) {
    return this.historialService.getArchivoMes(req.user.id, mes, anio);
  }

  // GET /historial/:mes/:anio/excel
  @Get(':mes/:anio/excel')
  exportarExcel(
    @Req() req: Request & { user: { id: string } },
    @Param('mes', ParseIntPipe) mes: number,
    @Param('anio', ParseIntPipe) anio: number,
    @Res() res: Response,
  ) {
    return this.historialService.exportarExcel(req.user.id, mes, anio, res);
  }

  // DELETE /historial/:mes/:anio
  @Delete(':mes/:anio')
  eliminarArchivo(
    @Req() req: Request & { user: { id: string } },
    @Param('mes', ParseIntPipe) mes: number,
    @Param('anio', ParseIntPipe) anio: number,
  ) {
    return this.historialService.eliminarArchivo(req.user.id, mes, anio);
  }

  // PATCH /historial/:mes/:anio
  @Patch(':mes/:anio')
  editarArchivo(
    @Req() req: Request & { user: { id: string } },
    @Param('mes', ParseIntPipe) mes: number,
    @Param('anio', ParseIntPipe) anio: number,
    @Body()
    body: { nota?: string; totalGastos?: number; totalSueldos?: number },
  ) {
    return this.historialService.editarArchivo(req.user.id, mes, anio, body);
  }
}
