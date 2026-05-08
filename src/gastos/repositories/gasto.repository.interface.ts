import { Gasto } from '@prisma/client';

// Tipos auxiliares para las operaciones del repositorio
export type CreateGastoInput = {
  userId: string;
  monto: number;
  descripcion: string;
  esExtraordinario?: boolean;
};

export type UpdateGastoInput = {
  monto?: number;
  descripcion?: string;
  esExtraordinario?: boolean;
};

// Interfaz del contrato: si mañana cambiamos de ORM, solo tocamos la implementación
export interface IGastoRepository {
  create(input: CreateGastoInput): Promise<Gasto>;
  update(id: string, input: UpdateGastoInput): Promise<Gasto>;
  findById(id: string): Promise<Gasto | null>;
  findByUser(userId: string): Promise<Gasto[]>;
  findByUserAndMonth(
    userId: string,
    mes: number,
    anio: number,
  ): Promise<Gasto[]>;
  getSumByUser(userId: string): Promise<number>;
  getSumByUserAndMonth(
    userId: string,
    mes: number,
    anio: number,
  ): Promise<number>;
  /** Solo gastos regulares (esExtraordinario = false) */
  getSumRegularByUser(userId: string): Promise<number>;
  getSumRegularByUserAndMonth(
    userId: string,
    mes: number,
    anio: number,
  ): Promise<number>;
  delete(id: string): Promise<Gasto>;
  checkGastoExcesivo(userId: string, monto: number): Promise<boolean>;
}
