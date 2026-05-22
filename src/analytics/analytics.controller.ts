import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  FileTypeValidator,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { AnalyticsService } from './analytics.service';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

@UseGuards(JwtGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /analytics/snapshot
   * Devuelve el snapshot completo de analytics del mes actual y lo persiste en DB.
   */
  @Get('snapshot')
  getSnapshot(@Request() req: any) {
    return this.analyticsService.getFullSnapshot(req.user.id);
  }

  /**
   * GET /analytics/burn-rate?mes=5&anio=2026
   * Burn rate: cuánto gastás por día y proyección del mes.
   */
  @Get('burn-rate')
  getBurnRate(
    @Request() req: any,
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    return this.analyticsService.getBurnRate(
      req.user.id,
      mes ? parseInt(mes, 10) : undefined,
      anio ? parseInt(anio, 10) : undefined,
    );
  }

  /**
   * GET /analytics/savings
   * Ahorro proyectado: ingreso − gasto proyectado del mes.
   */
  @Get('savings')
  getProjectedSavings(@Request() req: any) {
    return this.analyticsService.getProjectedSavings(req.user.id);
  }

  /**
   * GET /analytics/categories?mes=5&anio=2026
   * Breakdown de gastos por categoría con porcentajes.
   */
  @Get('categories')
  getCategoryBreakdown(
    @Request() req: any,
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    return this.analyticsService.getCategoryBreakdown(
      req.user.id,
      mes ? parseInt(mes, 10) : undefined,
      anio ? parseInt(anio, 10) : undefined,
    );
  }

  /**
   * GET /analytics/comparison
   * Comparación mes actual vs mes anterior con insight inteligente.
   */
  @Get('comparison')
  getMonthlyComparison(@Request() req: any) {
    return this.analyticsService.getMonthlyComparison(req.user.id);
  }

  /**
   * POST /analytics/import-csv
   * Importa gastos desde un archivo CSV.
   * Formato esperado: descripcion,monto,fecha
   */
  @Post('import-csv')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async importCsv(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new FileTypeValidator({ fileType: 'text/csv' })],
        fileIsRequired: false,
      }),
    )
    file: any,
    @Request() req: any,
  ) {
    const rows: any[] = [];
    await new Promise<void>((resolve, reject) => {
      const readable = Readable.from(file.buffer);
      readable
        .pipe(csvParser())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    return this.analyticsService.importFromCSV(rows, req.user.id);
  }

  /**
   * GET /analytics/bank-sync
   * Simula sincronización bancaria: crea transacciones mock y dispara eventos.
   */
  @Get('bank-sync')
  bankSync(@Request() req: any) {
    return this.analyticsService.getBankSyncMock(req.user.id);
  }
}
