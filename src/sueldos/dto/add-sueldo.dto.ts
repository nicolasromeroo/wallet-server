import { IsNumber, IsOptional, IsString } from 'class-validator';

export class AddSueldoDto {
  @IsNumber()
  monto: number;

  @IsOptional()
  @IsString()
  tipo?: string;
}
