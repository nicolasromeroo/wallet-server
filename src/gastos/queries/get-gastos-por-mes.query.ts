// Una Query también es solo una clase con los parámetros de búsqueda
// No muta estado, solo describe qué queremos leer
export class GetGastosPorMesQuery {
  constructor(
    public readonly userId: string,
    public readonly mes: number, // 1-12
    public readonly anio: number,
  ) {}
}
