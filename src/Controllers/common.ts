export enum DataType {
  STRING = "string",
  NUMBER = "number",
  INTEGER = "integer",
  PERMISSION_LEVEL = "'ELEVATED' | 'STANDARD'",
  DATETIME = "ISOstring",
  UUID = "string",
}

interface Body {
  [k: string]: DataType;
}

export function generateInvalidBodyError(body: Body) {
  return {
    type: "error",
    payload: {
      message: "The body of your request did not conform to the requirements",
      schema: { body },
    },
  };
}
