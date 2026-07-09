import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import * as cache from "./cache.ts";
import { clearToken, getRejectedToken, hasToken, setToken } from "./token.ts";
import { stopPolling, triggerImmediateRefresh } from "./poller.ts";
import {
  errorResponse,
  installGitLab,
  jsonResponse,
  sampleGroups,
  samplePipeline,
  sampleProjects,
  settle,
  sleep,
  type GitLabScript,
  type MockHandle,
} from "./testkit.ts";

function healthyScript(): GitLabScript {
  return {
    groups: () => jsonResponse(sampleGroups),
    projects: () => jsonResponse(sampleProjects),
    pipeline: () => jsonResponse(samplePipeline),
  };
}

function findRepo(groupId: string, repoId: number) {
  const group = cache.getPipelinesResponse().groups.find((entry) => entry.group === groupId);
  return group?.repos.find((repo) => repo.id === repoId) ?? null;
}

let mock: MockHandle;

beforeEach(() => {
  stopPolling();
  clearToken();
  cache.reset();
});

afterEach(() => {
  stopPolling();
  clearToken();
  cache.reset();
  mock.restore();
});

describe("Token GitLab et cycle de polling", () => {
  it("AC1 - un 403 sur un groupe ne purge pas le token et conserve le dernier etat connu du groupe", async () => {
    const script = healthyScript();
    mock = installGitLab(script);
    setToken("valid-token");

    triggerImmediateRefresh();
    await settle(mock.calls);

    const populated = findRepo("10", 100);
    assert.equal(populated?.pipeline?.status, "success");

    script.projects = () => errorResponse(403);
    triggerImmediateRefresh();
    await settle(mock.calls);

    assert.equal(hasToken(), true);
    const preserved = findRepo("10", 100);
    assert.ok(preserved, "le repo du groupe fautif doit rester present");
    assert.equal(preserved?.pipeline?.status, "success");
    assert.equal(getRejectedToken(), null);
  });

  it("AC1 - un 403 sur un pipeline de projet ne purge pas le token et conserve le dernier statut connu", async () => {
    const script = healthyScript();
    mock = installGitLab(script);
    setToken("valid-token");

    triggerImmediateRefresh();
    await settle(mock.calls);
    assert.equal(findRepo("10", 100)?.pipeline?.status, "success");

    script.pipeline = () => errorResponse(403);
    triggerImmediateRefresh();
    await settle(mock.calls);

    assert.equal(hasToken(), true);
    assert.equal(findRepo("10", 100)?.pipeline?.status, "success");
  });

  it("AC2 - un 401 purge le token, marque le token rejete et arrete le polling", async () => {
    const script = healthyScript();
    script.groups = () => errorResponse(401);
    mock = installGitLab(script);
    setToken("expired-token");

    triggerImmediateRefresh();
    await settle(mock.calls);

    assert.equal(hasToken(), false);
    assert.equal(getRejectedToken(), "expired-token");

    const callsAfterPurge = mock.calls();
    triggerImmediateRefresh();
    await sleep(120);
    assert.equal(mock.calls(), callsAfterPurge);
  });

  it("AC3 - un 429 ne purge pas le token, active le flag rate limit et conserve les donnees", async () => {
    const script = healthyScript();
    mock = installGitLab(script);
    setToken("valid-token");

    triggerImmediateRefresh();
    await settle(mock.calls);
    assert.equal(findRepo("10", 100)?.pipeline?.status, "success");

    script.groups = () => errorResponse(429, { "retry-after": "0" });
    script.projects = () => errorResponse(429, { "retry-after": "0" });
    script.pipeline = () => errorResponse(429, { "retry-after": "0" });
    triggerImmediateRefresh();
    await settle(mock.calls);

    assert.equal(hasToken(), true);
    assert.equal(cache.getStatusSnapshot().rateLimited, true);
    assert.equal(findRepo("10", 100)?.pipeline?.status, "success");
  });
});
