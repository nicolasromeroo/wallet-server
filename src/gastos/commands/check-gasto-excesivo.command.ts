// Un Command es solo un DTO de intención: "Quiero crear un gasto con estos datos"
// No tiene lógica, solo transporta los datos necesarios para ejecutar la acción
export class CheckGastoExcesivoCommand {
  constructor(
    public readonly userId: string,
    public readonly monto: number,
  ) {}
}
