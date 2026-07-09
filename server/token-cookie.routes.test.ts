import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import * as cache from "./cache.ts";
import { clearToken } from "./token.ts";
import { stopPolling } from "./poller.ts";
import { createApiRouter } from "./routes.ts";
import { installGitLab, jsonResponse, realFetch, type MockHandle } from "./testkit.ts";

let server: Server;
let mock: MockHandle;

function startServer(): Promise<number> {
  const app = express();
  app.use(express.json());
  app.use("/api", createApiRouter());
  return new Promise((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

function maxAgeSeconds(setCookie: string): number | null {
  const match = setCookie.match(/Max-Age=(\d+)/i);
  return match ? Number(match[1]) : null;
}

beforeEach(() => {
  stopPolling();
  clearToken();
  cache.reset();
  mock = installGitLab({
    groups: () => jsonResponse([]),
    projects: () => jsonResponse([]),
    pipeline: () => jsonResponse(null),
  });
});

afterEach(async () => {
  stopPolling();
  clearToken();
  cache.reset();
  mock.restore();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("Cookie porteur du token", () => {
  it("AC4 - le cookie du token est persistant avec une duree de vie explicite et non un cookie de session", async () => {
    const port = await startServer();

    const response = await realFetch(`http://127.0.0.1:${port}/api/token`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: "persist-me" }),
    });

    assert.equal(response.status, 200);

    const cookies = response.headers.getSetCookie();
    const tokenCookie = cookies.find((cookie) => cookie.startsWith("pipeboard_token="));
    assert.ok(tokenCookie, "un cookie pipeboard_token doit etre pose");

    const seconds = maxAgeSeconds(tokenCookie);
    assert.ok(seconds !== null && seconds > 0, "le cookie doit avoir un Max-Age explicite (> 0)");
    assert.match(tokenCookie, /Expires=/i);
  });
});
