import { config } from "../config.js";

const SUSPICIOUS_RE = /[<>"'`;$|&{}\\]/;
const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export interface ValidationError {
  valid: false;
  reason: string;
}

export interface ValidationSuccess {
  valid: true;
}

type ValidationResult = ValidationError | ValidationSuccess;

export function validateQuery(query: string): ValidationResult {
  if (!query || query.trim().length === 0) {
    return { valid: false, reason: "Query is required" };
  }
  if (query.length > config.maxQueryLength) {
    return { valid: false, reason: `Query exceeds ${config.maxQueryLength} characters` };
  }
  if (SUSPICIOUS_RE.test(query)) {
    return { valid: false, reason: "Query contains invalid characters" };
  }
  return { valid: true };
}

export function validateTrackId(id: string): ValidationResult {
  if (!id || id.trim().length === 0) {
    return { valid: false, reason: "Track ID is required" };
  }
  if (id.length > 100) {
    return { valid: false, reason: "Track ID too long" };
  }
  if (SUSPICIOUS_RE.test(id)) {
    return { valid: false, reason: "Track ID contains invalid characters" };
  }
  return { valid: true };
}
