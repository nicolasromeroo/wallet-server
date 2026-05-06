// Una Query también es solo una clase con los parámetros de búsqueda
// No muta estado, solo describe qué queremos leer
export class GetGastoExcesivoQuery {
  constructor(
    public readonly userId: string,
    public readonly monto: number,
  ) {}
}
