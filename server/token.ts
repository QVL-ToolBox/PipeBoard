let currentToken: string | null = null;

export function setToken(token: string): void {
  currentToken = token;
}

export function clearToken(): void {
  currentToken = null;
}

export function hasToken(): boolean {
  return currentToken !== null;
}

export function getToken(): string | null {
  return currentToken;
}
