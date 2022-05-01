import { Schema, z, ZodError } from "zod";
import SchemaError from "../Middleware/error/SchemaError";

// -- Schema definitions --

const SchemaVersion = z.enum(["1.0"]);

const TimeUnit = z.enum(["days", "hours", "minutes", "seconds", "milliseconds"]);

const DurationSchema = z
  .object({
    type: z.literal("duration"),
    min: z.number().int({ message: "min must be an integer (relative to smallestUnit)" }),
    max: z.number().int({ message: "max must be an integer (relative to smallestUnit)" }),
    smallestUnit: TimeUnit,
    higherIsBetter: z.boolean(),
  })
  .refine(({ min, max }) => min < max, { message: "min must be smaller than max" });

const PointSchema = z
  .object({
    type: z.literal("points"),
    min: z.number(),
    max: z.number(),
    step: z.number(),
    start: z.number(),

    unit: z.string(),
    unitSign: z.string(),

    higherIsBetter: z.boolean(),
  })
  .refine(({ min, max }) => min < max, { message: "min must be smaller than max" })
  .refine(({ min, max, start }) => min <= start && max >= start, {
    message: "start must be larger than or equal to min and smaller than or equal to max",
  });

export type DurationSchemaT = z.infer<typeof DurationSchema>;
export type PointSchemaT = z.infer<typeof PointSchema>;

// -- Parser --

export function parseSchema(schema: any): DurationSchemaT | PointSchemaT {
  try {
    if (schema.type === "duration") {
      return DurationSchema.parse(schema);
    } else if (schema.type === "points") {
      return PointSchema.parse(schema);
    }
  } catch (e) {
    if (e instanceof ZodError) {
      const issue = e.issues.at(0);

      if (issue) {
        throw new SchemaError(`${issue.path}: ${issue.message}`);
      }

      throw new SchemaError("Unknown error occured while validating the schema");
    }

    throw e;
  }

  throw new SchemaError("type must be either 'duration' or 'points'");
}
