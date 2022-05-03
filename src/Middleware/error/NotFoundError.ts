import ForwardableError from "./ForwardableError";

export default class NotFoundError extends ForwardableError {
  protected __oid = "NOT_FOUND_ERROR";

  constructor(resource?: string, pid?: string) {
    super(404, `The requested ${resource ?? "resource"}${pid ? ` with PID '${pid}'` : ""} could not be found!`);
  }

  static isNotFoundError(err: any): err is NotFoundError {
    return err.__oid === "NOT_FOUND_ERROR";
  }
}
