import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SueldosService } from './sueldos.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { AddSueldoDto } from './dto/add-sueldo.dto';

@Controller('sueldos')
export class SueldosController {
  constructor(private sueldosService: SueldosService) {}

  @UseGuards(JwtGuard)
  @Post('agregar')
  crear(@Body() dto: AddSueldoDto, @Req() req: any) {
    return this.sueldosService.addSueldo(req.user.id, dto);
  }

  @UseGuards(JwtGuard)
  @Get('listar')
  listar(@Req() req: any) {
    return this.sueldosService.getSueldosByUserId(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Put('actualizar')
  actualizar(@Body() body: { sueldoId: string; monto: number; tipo?: string }) {
    return this.sueldosService.updateSueldo(
      body.sueldoId,
      body.monto,
      body.tipo,
    );
  }

  @UseGuards(JwtGuard)
  @Delete('eliminar')
  eliminar(@Body() body: { sueldoId: string }) {
    return this.sueldosService.deleteSueldo(body.sueldoId);
  }
}
