export class CreateGastoCommand {
  constructor(
    public readonly userId: string,
    public readonly monto: number,
    public readonly descripcion: string,
    public readonly esExtraordinario: boolean = false,
    public readonly categoria?: string,
  ) {}
}
