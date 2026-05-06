import { IsNumber, IsString } from 'class-validator';

export class AddGastoDto {
  @IsString()
  descripcion!: string;
  @IsNumber()
  monto!: number;
}
