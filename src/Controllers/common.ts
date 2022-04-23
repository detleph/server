import { AdminLevel } from "@prisma/client";

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

export const AUTH_ERROR = {
  type: "failure",
  payload: {
    message: "The server was not able to validate your credentials; Please try again later",
  },
};

export const createInsufficientPermissionsError = (required: AdminLevel = "ELEVATED") => ({
  type: "error",
  payload: {
    message: "You do not have sufficient permissions to use this feature",
    required_level: required,
  },
  _links: [
    {
      rel: "authentication",
      href: "/api/authentication",
      type: "POST",
    },
  ],
});
