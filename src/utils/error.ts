import { type APICallError } from "ai";
import { isString, isObject } from "radash";

interface GeminiError {
  error: {
    code: number;
    message: string;
    status: string;
  };
}

function formatApiCallError(error: APICallError): string {
  if (error.responseBody) {
    try {
      const response = JSON.parse(error.responseBody) as GeminiError;
      if (response.error?.status && response.error?.message) {
        return `[${response.error.status}]: ${response.error.message}`;
      }
    } catch {
      // responseBody is not valid JSON; fall through
    }
  }
  return `[${error.name}]: ${error.message}`;
}

export function parseError(err: unknown): string {
  let errorMessage: string = "Unknown Error";
  if (isString(err)) {
    errorMessage = err;
  } else if (err instanceof Error) {
    errorMessage = formatApiCallError(err as APICallError);
  } else if (isObject(err)) {
    const { error } = err as { error: APICallError };
    if (error) {
      errorMessage = formatApiCallError(error);
    }
  }
  return errorMessage;
}
