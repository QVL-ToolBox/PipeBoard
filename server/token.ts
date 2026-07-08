let currentToken: string | null = null;
let epoch = 0;

export function setToken(token: string): void {
  currentToken = token;
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
