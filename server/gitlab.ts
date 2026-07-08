import type { GitLabGroup, GitLabPipeline, GitLabProject } from "./types.ts";

const GITLAB_API_BASE_URL = "https://gitlab.com/api/v4";
const MAX_CONCURRENCY = 8;
const MAX_RATE_LIMIT_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 2000;
const MAX_RETRY_AFTER_MS = 60000;

export class GitLabError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GitLabError";
    this.status = status;
  }
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function parseRetryAfterMs(response: Response): number {
  const header = response.headers.get("retry-after");
  if (header === null) {
    return DEFAULT_RETRY_AFTER_MS;
  }
  const seconds = Number(header);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return DEFAULT_RETRY_AFTER_MS;
  }
  return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
}

function buildUrl(path: string, query: Record<string, string>): URL {
  const url = new URL(`${GITLAB_API_BASE_URL}${path}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
}

async function requestWithBackoff(
  token: string,
  path: string,
  query: Record<string, string>,
): Promise<Response> {
  const url = buildUrl(path, query);
  let attempt = 0;
  for (;;) {
    const response = await fetch(url, { headers: { "PRIVATE-TOKEN": token } });
    if (response.status !== 429) {
      return response;
    }
    if (attempt >= MAX_RATE_LIMIT_RETRIES) {
      throw new GitLabError(429, "GitLab rate limit exceeded");
    }
    await delay(parseRetryAfterMs(response));
    attempt += 1;
  }
}

export async function fetchMembershipGroups(token: string): Promise<GitLabGroup[]> {
  const groups: GitLabGroup[] = [];
  let page = 1;
  for (;;) {
    const response = await requestWithBackoff(token, "/groups", {
      membership: "true",
      per_page: "100",
      page: String(page),
    });
    if (!response.ok) {
      throw new GitLabError(response.status, "GitLab groups request failed");
    }
    const batch = (await response.json()) as GitLabGroup[];
    groups.push(...batch);
    const nextPage = Number(response.headers.get("x-next-page"));
    if (!Number.isInteger(nextPage) || nextPage <= 0) {
      break;
    }
    page = nextPage;
  }
  return groups;
}

export async function fetchGroupProjects(
  token: string,
  groupId: number,
): Promise<GitLabProject[]> {
  const projects: GitLabProject[] = [];
  let page = 1;
  for (;;) {
    const response = await requestWithBackoff(
      token,
      `/groups/${encodeURIComponent(String(groupId))}/projects`,
      {
        include_subgroups: "true",
        per_page: "100",
        archived: "false",
        simple: "true",
        page: String(page),
      },
    );
    if (!response.ok) {
      throw new GitLabError(response.status, "GitLab projects request failed");
    }
    const batch = (await response.json()) as GitLabProject[];
    projects.push(...batch);
    const nextPage = Number(response.headers.get("x-next-page"));
    if (!Number.isInteger(nextPage) || nextPage <= 0) {
      break;
    }
    page = nextPage;
  }
  return projects;
}

export async function fetchLatestPipeline(
  token: string,
  projectId: number,
  ref: string,
): Promise<GitLabPipeline | null> {
  const response = await requestWithBackoff(
    token,
    `/projects/${encodeURIComponent(String(projectId))}/pipelines/latest`,
    { ref },
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new GitLabError(response.status, "GitLab pipeline request failed");
  }
  return (await response.json()) as GitLabPipeline;
}

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) {
        return;
      }
      results[index] = await worker(items[index]!, index);
    }
  }
  const runners = Array.from({ length: Math.min(MAX_CONCURRENCY, items.length) }, run);
  await Promise.all(runners);
  return results;
}
