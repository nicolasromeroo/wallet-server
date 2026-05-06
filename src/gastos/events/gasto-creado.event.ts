// El evento es inmutable: representa algo que YA ocurrió en el sistema
// Pasado del indicativo: "GastoCreado", no "CrearGasto"
export class GastoCreadoEvent {
  public readonly ocurridoEn: Date;

  constructor(
    public readonly gastoId: string,
    public readonly userId: string,
    public readonly monto: number,
  ) {
    this.ocurridoEn = new Date();
  }
}
