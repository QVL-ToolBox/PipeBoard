import * as cache from "./cache.ts";
import { clearToken, getToken, getTokenEpoch, markTokenRejected } from "./token.ts";
import {
  GitLabError,
  fetchGroupProjects,
  fetchLatestPipeline,
  fetchMembershipGroups,
  mapWithConcurrency,
} from "./gitlab.ts";
import type { GitLabGroup, GroupPipelines, PollableRepo, Repo, RepoPipeline } from "./types.ts";

const LISTING_INTERVAL_MS = 5 * 60 * 1000;
const STATUS_INTERVAL_MS = 30 * 1000;

interface RepoPipelineResult {
  id: number;
  pipeline: RepoPipeline | null;
  resolved: boolean;
}

let listingTimer: NodeJS.Timeout | null = null;
let statusTimer: NodeJS.Timeout | null = null;
let listingInFlight = false;
let statusInFlight = false;

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

export function triggerImmediateRefresh(): void {
  void bootstrapCycles();
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
    markTokenRejected();
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

function selectRootGroups(groups: GitLabGroup[]): GitLabGroup[] {
  const roots = groups.filter(
    (group) =>
      !groups.some(
        (other) =>
          other.full_path !== group.full_path &&
          group.full_path.startsWith(`${other.full_path}/`),
      ),
  );
  return roots.sort((a, b) => a.full_path.localeCompare(b.full_path));
}

async function buildGroupListing(
  token: string,
  group: GitLabGroup,
): Promise<GroupPipelines> {
  const groupId = String(group.id);
  try {
    const projects = await fetchGroupProjects(token, group.id);
    const repos: Repo[] = projects.map((project) => ({
      id: project.id,
      name: project.name,
      pathWithNamespace: project.path_with_namespace,
      webUrl: project.web_url,
      defaultBranch: project.default_branch,
      pipeline: null,
    }));
    return { group: groupId, name: group.full_path, repos };
  } catch (error) {
    if (isAuthError(error) || isRateLimitError(error)) {
      throw error;
    }
    console.error("[PipeBoard] GitLab listing failed for a group, keeping last known data");
    return cache.getGroupSnapshot(groupId) ?? { group: groupId, name: group.full_path, repos: [] };
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
    const discovered = await fetchMembershipGroups(token);
    const roots = selectRootGroups(discovered);
    const groups = await mapWithConcurrency(roots, (group) => buildGroupListing(token, group));
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
