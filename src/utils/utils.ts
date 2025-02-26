import { ZodType } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

/**
 * Converts a value to JSON schema if it's a Zod schema, otherwise returns it as-is
 * @param schema - The schema to convert (can be Zod schema or plain JSON schema)
 * @returns Converted JSON schema or the original value
 */
export function convertToJsonSchema(
  schema: ZodType | Record<string, any> | null | undefined,
  zodToJsonParams?: any
): Record<string, any> | null | undefined {
  const isZodSchema =
    schema instanceof ZodType ||
    typeof (schema as any)?.safeParse === "function";

  if (isZodSchema && schema) {
    return zodToJsonSchema(schema as ZodType, zodToJsonParams);
  }

  return schema;
}
