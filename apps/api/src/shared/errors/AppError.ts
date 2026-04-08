// Classe de erro padrão do sistema
// Toda vez que algo der errado de forma esperada, lançamos este erro
// O middleware de erro global captura e retorna o JSON correto
export class AppError {
  public readonly message: string
  public readonly statusCode: number

  constructor(message: string, statusCode = 400) {
    this.message = message
    this.statusCode = statusCode
  }
}
