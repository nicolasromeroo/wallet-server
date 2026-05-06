// import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
// import { ProyeccionService } from './proyeccion.service';
// import { CreateProyeccionDto } from './dto/create-proyeccion.dto';
// import { UpdateProyeccionDto } from './dto/update-proyeccion.dto';

// @Controller('proyeccion')
// export class ProyeccionController {
//   constructor(private readonly proyeccionService: ProyeccionService) {}

//   @Post()
//   create(@Body() createProyeccionDto: CreateProyeccionDto) {
//     return this.proyeccionService.create(createProyeccionDto);
//   }

//   @Get()
//   findAll() {
//     return this.proyeccionService.findAll();
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.proyeccionService.findOne(+id);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() updateProyeccionDto: UpdateProyeccionDto) {
//     return this.proyeccionService.update(+id, updateProyeccionDto);
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.proyeccionService.remove(+id);
//   }
// }
