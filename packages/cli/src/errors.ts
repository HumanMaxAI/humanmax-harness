import { EXIT_CODES } from "@humanmax/contracts";

export type CliErrorKind = "usage" | "packTrust" | "internal";

export class CliError extends Error {
  readonly kind: CliErrorKind;

  constructor(kind: CliErrorKind, message: string) {
    super(message);
    this.name = "CliError";
    this.kind = kind;
  }
}

export function usageError(message: string): CliError {
  return new CliError("usage", message);
}

export function packTrustError(message: string): CliError {
  return new CliError("packTrust", message);
}

export function internalError(message: string): CliError {
  return new CliError("internal", message);
}

/**
 * Exit codes are stable public API, so they are derived from the error class an
 * operation raised and never from the wording of a message.
 */
export function exitCodeForError(error: unknown): number {
  if (!(error instanceof CliError)) {
    return EXIT_CODES.internal;
  }
  if (error.kind === "usage") {
    return EXIT_CODES.usage;
  }
  if (error.kind === "packTrust") {
    return EXIT_CODES.packTrust;
  }
  return EXIT_CODES.internal;
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
