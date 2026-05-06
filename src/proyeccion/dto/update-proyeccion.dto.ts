import { PartialType } from '@nestjs/mapped-types';
import { CreateProyeccionDto } from './create-proyeccion.dto';

export class UpdateProyeccionDto extends PartialType(CreateProyeccionDto) {}
