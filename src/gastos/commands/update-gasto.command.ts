export class UpdateGastoCommand {
  constructor(
    public readonly gastoId: string,
    public readonly userId: string,
    public readonly monto?: number,
    public readonly descripcion?: string,
    public readonly esExtraordinario?: boolean,
    public readonly categoria?: string,
  ) {}
}
