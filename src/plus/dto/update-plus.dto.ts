import { PartialType } from '@nestjs/mapped-types';
import { CreatePlusDto } from './create-plus.dto';

export class UpdatePlusDto extends PartialType(CreatePlusDto) {}
