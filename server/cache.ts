import type {
  GroupPipelines,
  PipelinesResponse,
  PollableRepo,
  RepoPipeline,
} from "./types.ts";

interface StatusSnapshot {
  lastListingRefresh: string | null;
  lastStatusRefresh: string | null;
  rateLimited: boolean;
}

interface CacheState {
  groups: GroupPipelines[];
  lastListingRefresh: string | null;
  lastStatusRefresh: string | null;
  rateLimited: boolean;
}

const state: CacheState = {
  groups: [],
  lastListingRefresh: null,
  lastStatusRefresh: null,
  rateLimited: false,
};

export function getPipelinesResponse(): PipelinesResponse {
  return { groups: state.groups };
}

export function getStatusSnapshot(): StatusSnapshot {
  return {
    lastListingRefresh: state.lastListingRefresh,
    lastStatusRefresh: state.lastStatusRefresh,
    rateLimited: state.rateLimited,
  };
}

export function getPollableRepos(): PollableRepo[] {
  const repos: PollableRepo[] = [];
  for (const group of state.groups) {
    for (const repo of group.repos) {
      if (repo.defaultBranch !== null) {
        repos.push({ id: repo.id, defaultBranch: repo.defaultBranch });
      }
    }
  }
  return repos;
}

export function replaceListing(groups: GroupPipelines[]): void {
  const previousPipelines = new Map<number, RepoPipeline | null>();
  for (const group of state.groups) {
    for (const repo of group.repos) {
      previousPipelines.set(repo.id, repo.pipeline);
    }
  }
  for (const group of groups) {
    for (const repo of group.repos) {
      if (repo.pipeline === null && previousPipelines.has(repo.id)) {
        repo.pipeline = previousPipelines.get(repo.id) ?? null;
      }
    }
  }
  state.groups = groups;
  state.lastListingRefresh = new Date().toISOString();
}

export function applyPipelineUpdates(updates: Map<number, RepoPipeline | null>): void {
  for (const group of state.groups) {
    for (const repo of group.repos) {
      if (updates.has(repo.id)) {
        repo.pipeline = updates.get(repo.id) ?? null;
      }
    }
  }
}

export function markStatusRefresh(): void {
  state.lastStatusRefresh = new Date().toISOString();
}

export function setRateLimited(value: boolean): void {
  state.rateLimited = value;
}

export function reset(): void {
  state.groups = [];
  state.lastListingRefresh = null;
  state.lastStatusRefresh = null;
  state.rateLimited = false;
}
