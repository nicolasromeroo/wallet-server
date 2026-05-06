import { PartialType } from '@nestjs/mapped-types';
import { AddGastoDto } from './add-gasto.dto';

export class UpdateGastoDto extends PartialType(AddGastoDto) {}
