export class GetSaldoQuery {
  constructor(
    public readonly userId: string,
    public readonly mes?: number,
    public readonly anio?: number,
  ) {}
}
