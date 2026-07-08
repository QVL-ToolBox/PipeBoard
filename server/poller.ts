import type { GroupReference } from "./config.ts";
import * as cache from "./cache.ts";
import { clearToken, getToken, getTokenEpoch } from "./token.ts";
import {
  GitLabError,
  fetchGroupInfo,
  fetchGroupProjects,
  fetchLatestPipeline,
  mapWithConcurrency,
} from "./gitlab.ts";
import type { GroupPipelines, PollableRepo, Repo, RepoPipeline } from "./types.ts";

const LISTING_INTERVAL_MS = 5 * 60 * 1000;
const STATUS_INTERVAL_MS = 30 * 1000;

interface RepoPipelineResult {
  id: number;
  pipeline: RepoPipeline | null;
  resolved: boolean;
}

let configuredGroups: GroupReference[] = [];
let listingTimer: NodeJS.Timeout | null = null;
let statusTimer: NodeJS.Timeout | null = null;
let listingInFlight = false;
let statusInFlight = false;

export function configurePoller(groups: GroupReference[]): void {
  configuredGroups = groups;
}

export function startPolling(): void {
  stopPolling();
  void bootstrapCycles();
  listingTimer = setInterval(() => {
    void runListingCycle();
  }, LISTING_INTERVAL_MS);
  statusTimer = setInterval(() => {
    void runStatusCycle();
  }, STATUS_INTERVAL_MS);
}

export function stopPolling(): void {
  if (listingTimer !== null) {
    clearInterval(listingTimer);
    listingTimer = null;
  }
  if (statusTimer !== null) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
}

async function bootstrapCycles(): Promise<void> {
  await runListingCycle();
  await runStatusCycle();
}

function isAuthError(error: unknown): boolean {
  return error instanceof GitLabError && (error.status === 401 || error.status === 403);
}

function isRateLimitError(error: unknown): boolean {
  return error instanceof GitLabError && error.status === 429;
}

function handleCycleError(error: unknown): void {
  if (isAuthError(error)) {
    console.error("[PipeBoard] GitLab authentication rejected, token purged and polling stopped");
    clearToken();
    stopPolling();
    cache.setRateLimited(false);
    return;
  }
  if (isRateLimitError(error)) {
    cache.setRateLimited(true);
    return;
  }
  console.error("[PipeBoard] GitLab polling cycle failed, keeping last known data");
}

async function resolveGroupName(
  token: string,
  groupRef: GroupReference,
  fallback: string,
): Promise<string> {
  try {
    const info = await fetchGroupInfo(token, groupRef);
    const trimmed = info.name.trim();
    return trimmed.length > 0 ? trimmed : fallback;
  } catch (error) {
    if (isAuthError(error) || isRateLimitError(error)) {
      throw error;
    }
    return fallback;
  }
}

async function buildGroupListing(
  token: string,
  groupRef: GroupReference,
): Promise<GroupPipelines> {
  const normalized = String(groupRef);
  try {
    const name = await resolveGroupName(token, groupRef, normalized);
    const projects = await fetchGroupProjects(token, groupRef);
    const repos: Repo[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      pathWithNamespace: project.path_with_namespace,
      webUrl: project.web_url,
      defaultBranch: project.default_branch,
      pipeline: null,
    }));
    return { group: normalized, name, repos };
  } catch (error) {
    if (isAuthError(error) || isRateLimitError(error)) {
      throw error;
    }
    console.error("[PipeBoard] GitLab listing failed for a configured group, keeping last known data");
    return cache.getGroupSnapshot(normalized) ?? { group: normalized, name: normalized, repos: [] };
  }
}

async function runListingCycle(): Promise<void> {
  if (listingInFlight) {
    return;
  }
  const token = getToken();
  if (token === null) {
    return;
  }
  const epoch = getTokenEpoch();
  listingInFlight = true;
  try {
    const groups = await mapWithConcurrency(configuredGroups, (groupRef) =>
      buildGroupListing(token, groupRef),
    );
    if (getTokenEpoch() === epoch) {
      cache.replaceListing(groups);
      cache.setRateLimited(false);
    }
  } catch (error) {
    handleCycleError(error);
  } finally {
    listingInFlight = false;
  }
}

async function fetchRepoPipeline(
  token: string,
  repo: PollableRepo,
): Promise<RepoPipelineResult> {
  try {
    const pipeline = await fetchLatestPipeline(token, repo.id, repo.defaultBranch);
    if (pipeline === null) {
      return { id: repo.id, pipeline: null, resolved: true };
    }
    return {
      id: repo.id,
      pipeline: {
        status: pipeline.status,
        webUrl: pipeline.web_url,
        updatedAt: pipeline.updated_at,
      },
      resolved: true,
    };
  } catch (error) {
    if (isAuthError(error) || isRateLimitError(error)) {
      throw error;
    }
    return { id: repo.id, pipeline: null, resolved: false };
  }
}

async function runStatusCycle(): Promise<void> {
  if (statusInFlight) {
    return;
  }
  const token = getToken();
  if (token === null) {
    return;
  }
  const repos = cache.getPollableRepos();
  if (repos.length === 0) {
    cache.markStatusRefresh();
    cache.setRateLimited(false);
    return;
  }
  const epoch = getTokenEpoch();
  statusInFlight = true;
  try {
    const results = await mapWithConcurrency(repos, (repo) => fetchRepoPipeline(token, repo));
    if (getTokenEpoch() === epoch) {
      const updates = new Map<number, RepoPipeline | null>();
      for (const result of results) {
        if (result.resolved) {
          updates.set(result.id, result.pipeline);
        }
      }
      cache.applyPipelineUpdates(updates);
      cache.markStatusRefresh();
      cache.setRateLimited(false);
    }
  } catch (error) {
    handleCycleError(error);
  } finally {
    statusInFlight = false;
  }
}
