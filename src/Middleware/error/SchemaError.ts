import ForwardableError from "./ForwardableError";

export default class SchemaError extends ForwardableError {
  protected __oid = "SCHEMA_ERROR";

  constructor(message: string) {
    super(400, message);
  }
}
