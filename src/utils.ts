export const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}
