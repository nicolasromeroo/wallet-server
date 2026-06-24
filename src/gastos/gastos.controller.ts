import {
  Controller,
  Post,
  Put,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GastosService } from './gastos.service';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { GastoRepository } from './repositories/gasto.repository';
import { SueldoRepository } from '../sueldos/repositories/sueldo.repository';
import { CreateGastoDto } from './dto/create-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';

@Controller('gastos')
@UseGuards(JwtGuard)
export class GastosController {
  constructor(
    private readonly gastosService: GastosService,
    private readonly gastoRepository: GastoRepository,
    private readonly sueldoRepository: SueldoRepository,
  ) {}

  @Get()
  listar(@Req() req: any) {
    return this.gastosService.listar(req.user.id);
  }

  @Get('saldo')
  getSaldo(
    @Req() req: any,
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    return this.gastosService.getSaldo(
      req.user.id,
      mes ? parseInt(mes, 10) : undefined,
      anio ? parseInt(anio, 10) : undefined,
    );
  }

  @Post()
  crearGasto(@Req() req: any, @Body() dto: CreateGastoDto) {
    return this.gastosService.crearGasto(
      req.user.id,
      dto.monto,
      dto.descripcion,
      dto.esExtraordinario ?? false,
      dto.categoria,
    );
  }

  @Put('update/:id')
  actualizarGasto(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateGastoDto,
  ) {
    return this.gastosService.actualizarGasto(
      id,
      req.user.id,
      dto.monto,
      dto.descripcion,
      dto.esExtraordinario,
      dto.categoria,
    );
  }

  @Delete('delete/:id')
  eliminarGasto(@Req() req: any, @Param('id') id: string) {
    return this.gastosService.eliminarGasto(id, req.user.id);
  }

  // GET /gastos/por-mes?mes=5&anio=2026
  @Get('por-mes')
  getGastosPorMes(
    @Req() req: any,
    @Query('mes') mes: string,
    @Query('anio') anio: string,
  ) {
    return this.gastosService.getGastosPorMes(
      req.user.id,
      parseInt(mes, 10),
      parseInt(anio, 10),
    );
  }

  @Get('excesivo')
  getGastoExcesivo(@Req() req: any, @Query('monto') monto: string) {
    return this.gastosService.getGastoExcesivo(req.user.id, parseFloat(monto));
  }

  // Endpoint temporal de diagnóstico - muestra los valores exactos de la BD
  @Get('debug-saldo')
  async debugSaldo(@Req() req: any) {
    const userId = req.user.id;
    const [sueldos, gastos, totalSueldos, totalGastos, totalGastosRegular] =
      await Promise.all([
        this.sueldoRepository.findAll(userId),
        this.gastoRepository.findByUser(userId),
        this.sueldoRepository.getSumAll(userId),
        this.gastoRepository.getSumByUser(userId),
        this.gastoRepository.getSumRegularByUser(userId),
      ]);
    return {
      sueldos,
      gastos: gastos.map((g) => ({
        id: g.id,
        monto: g.monto,
        descripcion: g.descripcion,
        esExtraordinario: g.esExtraordinario,
      })),
      resumen: {
        totalSueldos,
        totalGastos,
        totalGastosRegular,
        saldoConTodos: totalSueldos - totalGastos,
        saldoSoloRegulares: totalSueldos - totalGastosRegular,
      },
    };
  }

  // seccion de logica de negocio para machine learning | microservicio de python + fastapi
  @Get('resumen-mensual/:userId')
  getResumen(@Param('userId') userId: string) {
    return this.gastosService.getResumenMensual(userId);
  }
}
