import { IsOptional, IsString } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  sueldoId?: string;

  @IsOptional()
  @IsString()
  gastoId?: string;
}
