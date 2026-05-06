import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlusService } from './plus.service';
import { CreatePlusDto } from './dto/create-plus.dto';
import { UpdatePlusDto } from './dto/update-plus.dto';

@Controller('plus')
export class PlusController {
  constructor(private readonly plusService: PlusService) {}

  @Post()
  create(@Body() createPlusDto: CreatePlusDto) {
    return this.plusService.create(createPlusDto);
  }

  @Get()
  findAll() {
    return this.plusService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plusService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlusDto: UpdatePlusDto) {
    return this.plusService.update(+id, updatePlusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plusService.remove(+id);
  }
}
