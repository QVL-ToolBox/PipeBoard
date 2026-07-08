export interface Pipeline {
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
  pipeline: Pipeline | null;
}

export interface Group {
  group: string;
  name: string;
  repos: Repo[];
}

export interface PipelinesResponse {
  groups: Group[];
}

export interface StatusResponse {
  tokenSet: boolean;
  lastListingRefresh: string | null;
  lastStatusRefresh: string | null;
  rateLimited: boolean;
}
