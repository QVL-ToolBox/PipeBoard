let currentToken: string | null = null;
let rejectedToken: string | null = null;
let epoch = 0;

export function setToken(token: string): void {
  currentToken = token;
  rejectedToken = null;
  epoch += 1;
}

export function clearToken(): void {
  currentToken = null;
  epoch += 1;
}

export function hasToken(): boolean {
  return currentToken !== null;
}

export function getToken(): string | null {
  return currentToken;
}

export function getTokenEpoch(): number {
  return epoch;
}

export function markTokenRejected(): void {
  rejectedToken = currentToken;
}

export function getRejectedToken(): string | null {
  return rejectedToken;
}
