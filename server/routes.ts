import { Router } from "express";
import type { CookieOptions } from "express";
import * as cache from "./cache.ts";
import { clearToken, getRejectedToken, hasToken, setToken } from "./token.ts";
import { startPolling, stopPolling, triggerImmediateRefresh } from "./poller.ts";
import type { StatusResponse } from "./types.ts";

const TOKEN_COOKIE_NAME = "pipeboard_token";
const TOKEN_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: "strict",
  path: "/api",
  maxAge: 1000 * 60 * 60 * 24 * 30,
};

function extractToken(body: unknown): string | null {
  if (typeof body !== "object" || body === null) {
    return null;
  }
  const token = (body as Record<string, unknown>).token;
  if (typeof token !== "string") {
    return null;
  }
  const trimmed = token.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (header === undefined) {
    return cookies;
  }
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }
    const key = part.slice(0, separator).trim();
    if (key.length > 0) {
      cookies[key] = part.slice(separator + 1).trim();
    }
  }
  return cookies;
}

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function createApiRouter(): Router {
  const router = Router();

  router.use((req, res, next) => {
    if (!hasToken()) {
      const raw = parseCookies(req.headers.cookie)[TOKEN_COOKIE_NAME];
      const token = raw === undefined ? null : safeDecode(raw);
      if (token !== null && token.length > 0) {
        if (token === getRejectedToken()) {
          res.clearCookie(TOKEN_COOKIE_NAME, TOKEN_COOKIE_OPTIONS);
        } else {
          setToken(token);
          startPolling();
        }
      }
    }
    next();
  });

  router.get("/status", (_req, res) => {
    const snapshot = cache.getStatusSnapshot();
    const body: StatusResponse = {
      tokenSet: hasToken(),
      lastListingRefresh: snapshot.lastListingRefresh,
      lastStatusRefresh: snapshot.lastStatusRefresh,
      rateLimited: snapshot.rateLimited,
    };
    res.json(body);
  });

  router.get("/pipelines", (_req, res) => {
    res.json(cache.getPipelinesResponse());
  });

  router.post("/token", (req, res) => {
    const token = extractToken(req.body);
    if (token === null) {
      res.status(400).json({ error: "Invalid token payload" });
      return;
    }
    setToken(token);
    res.cookie(TOKEN_COOKIE_NAME, encodeURIComponent(token), TOKEN_COOKIE_OPTIONS);
    startPolling();
    res.json({ ok: true });
  });

  router.post("/refresh", (_req, res) => {
    if (!hasToken()) {
      res.status(400).json({ error: "No token configured" });
      return;
    }
    triggerImmediateRefresh();
    res.json({ ok: true });
  });

  router.delete("/token", (_req, res) => {
    stopPolling();
    clearToken();
    cache.reset();
    res.clearCookie(TOKEN_COOKIE_NAME, TOKEN_COOKIE_OPTIONS);
    res.json({ ok: true });
  });

  return router;
}
