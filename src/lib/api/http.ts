import { z } from "zod";

export function apiError(status: number, code: string, message: string, details?: unknown) {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  );
}

export function validationError(error: z.ZodError) {
  return apiError(
    400,
    "INVALID_REQUEST",
    "The request contains invalid parameters.",
    error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
  );
}

export async function readJsonBody(request: Request) {
  try {
    return { ok: true as const, value: await request.json() };
  } catch {
    return {
      ok: false as const,
      response: apiError(400, "INVALID_JSON", "The request body must be valid JSON."),
    };
  }
}
