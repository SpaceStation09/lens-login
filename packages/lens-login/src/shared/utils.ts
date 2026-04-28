export function normalizeAddress(value: string) {
  return value.toLowerCase();
}

export function normalizeText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export abstract class LensLoginError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
