export async function getAdminApiError(response: Response, fallback: string) {
  try {
    const result: unknown = await response.json();
    if (
      result &&
      typeof result === "object" &&
      "error" in result &&
      result.error &&
      typeof result.error === "object" &&
      "message" in result.error &&
      typeof result.error.message === "string"
    ) {
      return result.error.message;
    }
  } catch (error) {
    console.error("Admin API returned an unreadable error response.", error);
  }
  return fallback;
}
