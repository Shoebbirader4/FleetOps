const SENSITIVE_VALUE = /(^|[?&\s])((?:token|access_token|refresh_token|password|secret|key)=)[^&\s]+/gi;

export function createRequestId() {
  return crypto.randomUUID();
}

export function redactMessage(message: string) {
  return message.replace(SENSITIVE_VALUE, "$1$2[REDACTED]").slice(0, 500);
}

export function logRequestError(input: { requestId: string; path?: string; code?: string; message?: string }) {
  console.error(JSON.stringify({
    event: "api_error",
    requestId: input.requestId,
    path: input.path ?? "unknown",
    code: input.code ?? "INTERNAL_SERVER_ERROR",
    message: redactMessage(input.message ?? "Unhandled API error"),
    timestamp: new Date().toISOString(),
  }));
}
