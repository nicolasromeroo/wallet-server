import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GastoService } from './gasto.service';
import { AddGastoDto } from './dto/add-gasto.dto';
import { UpdateGastoDto } from './dto/update-gasto.dto';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@Controller('gasto')
export class GastoController {
  constructor(private readonly gastoService: GastoService) {}

  @UseGuards(JwtGuard)
  @Post('agregar')
  create(@Body() addGastoDto: AddGastoDto, @Req() req: any) {
    return this.gastoService.create(req.user.id, addGastoDto);
  }

  @UseGuards(JwtGuard)
  @Get('saldo')
  saldo(@Req() req: any) {
    return this.gastoService.getSaldo(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Get('listar-todos')
  findAll(@Req() req: any) {
    // Devuelve solo los gastos del usuario autenticado
    return this.gastoService.findByUser(req.user.id);
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gastoService.findOne(id);
  }

  @UseGuards(JwtGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGastoDto: UpdateGastoDto) {
    return this.gastoService.update(id, updateGastoDto);
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gastoService.delete(id);
  }
}
