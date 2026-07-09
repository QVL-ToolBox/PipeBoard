import type { GitLabGroup, GitLabPipeline, GitLabProject } from "./types.ts";

export interface GitLabScript {
  groups: () => Response;
  projects: (groupId: string) => Response;
  pipeline: (projectId: string) => Response;
}

export interface MockHandle {
  restore: () => void;
  calls: () => number;
}

export const realFetch = globalThis.fetch;

export function jsonResponse(data: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json", ...headers },
  });
}

export function errorResponse(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers });
}

export function installGitLab(script: GitLabScript): MockHandle {
  const original = globalThis.fetch;
  let count = 0;
  const handler = async (input: Parameters<typeof fetch>[0]): Promise<Response> => {
    count += 1;
    const url = input instanceof URL ? input : new URL(String(input));
    const path = url.pathname;
    if (path.endsWith("/groups")) {
      return script.groups();
    }
    const projectsMatch = path.match(/\/groups\/([^/]+)\/projects$/);
    if (projectsMatch) {
      return script.projects(projectsMatch[1]!);
    }
    const pipelineMatch = path.match(/\/projects\/([^/]+)\/pipelines\/latest$/);
    if (pipelineMatch) {
      return script.pipeline(pipelineMatch[1]!);
    }
    throw new Error(`unexpected GitLab call: ${path}`);
  };
  globalThis.fetch = handler as unknown as typeof fetch;
  return {
    restore: () => {
      globalThis.fetch = original;
    },
    calls: () => count,
  };
}

export function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function settle(
  calls: () => number,
  quietMs = 60,
  timeoutMs = 4000,
): Promise<void> {
  const start = Date.now();
  let last = calls();
  let changedAt = Date.now();
  for (;;) {
    await sleep(10);
    const current = calls();
    if (current !== last) {
      last = current;
      changedAt = Date.now();
    }
    if (Date.now() - changedAt >= quietMs) {
      return;
    }
    if (Date.now() - start > timeoutMs) {
      return;
    }
  }
}

export const sampleGroups: GitLabGroup[] = [{ id: 10, full_path: "acme" }];

export const sampleProjects: GitLabProject[] = [
  {
    id: 100,
    name: "web",
    path_with_namespace: "acme/web",
    web_url: "https://gitlab.com/acme/web",
    default_branch: "main",
  },
];

export const samplePipeline: GitLabPipeline = {
  status: "success",
  web_url: "https://gitlab.com/acme/web/-/pipelines/1",
  updated_at: "2026-01-01T00:00:00Z",
};
