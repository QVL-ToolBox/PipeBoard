export interface RepoPipeline {
  status: string;
  webUrl: string;
  updatedAt: string;
}

export interface Repo {
  id: number;
  name: string;
  pathWithNamespace: string;
  webUrl: string;
  defaultBranch: string | null;
  pipeline: RepoPipeline | null;
}

export interface GroupPipelines {
  group: string;
  name: string;
  repos: Repo[];
}

export interface PipelinesResponse {
  groups: GroupPipelines[];
}

export interface StatusResponse {
  tokenSet: boolean;
  lastListingRefresh: string | null;
  lastStatusRefresh: string | null;
  rateLimited: boolean;
}

export interface PollableRepo {
  id: number;
  defaultBranch: string;
}

export interface GitLabGroup {
  id: number;
  full_path: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  default_branch: string | null;
}

export interface GitLabPipeline {
  status: string;
  web_url: string;
  updated_at: string;
}
