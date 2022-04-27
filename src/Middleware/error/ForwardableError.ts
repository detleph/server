export default class ForwardableError extends Error {
  // If in different context
  private readonly __id = "CUSTOM_ERROR";

  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);

    this.status = status;
  }

  static isForwardableError(error: any): error is ForwardableError {
    return error.__id === "CUSTOM_ERROR";
  }
}
