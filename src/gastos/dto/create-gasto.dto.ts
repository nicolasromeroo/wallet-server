import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGastoDto {
  @IsString()
  descripcion!: string;

  @IsNumber()
  monto!: number;

  @IsOptional()
  @IsBoolean()
  esExtraordinario?: boolean;

  @IsOptional()
  @IsString()
  categoria?: string;
}
