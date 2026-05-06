export class DeleteGastoCommand {
  constructor(
    public readonly gastoId: string,
    public readonly userId: string,
  ) {}
}
