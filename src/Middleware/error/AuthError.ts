import ForwardableError from "./ForwardableError";

export default class AuthError extends ForwardableError {
  protected __oid = "AUTH_ERROR";

  constructor(message?: string) {
    super(403, message ?? "The request did not provide sufficient authentication");
  }

  static isAuthError(err: any): err is AuthError {
    return err.__oid === "AUTH_ERROR";
  }
}
