import { Router } from "express";
import * as cache from "./cache.ts";
import { clearToken, hasToken, setToken } from "./token.ts";
import { startPolling, stopPolling } from "./poller.ts";
import type { StatusResponse } from "./types.ts";

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

export function createApiRouter(): Router {
  const router = Router();

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
    startPolling();
    res.json({ ok: true });
  });

  router.delete("/token", (_req, res) => {
    stopPolling();
    clearToken();
    cache.reset();
    res.json({ ok: true });
  });

  return router;
}
