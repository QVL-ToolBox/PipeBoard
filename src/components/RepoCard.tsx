import { Card, Link, Stack } from "canopui";
import type { Repo } from "../types";
import { PipelineBadge } from "./PipelineBadge";

function toHttpsUrl(url: string): string | null {
  try {
    return new URL(url).protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export interface RepoCardProps {
  repo: Repo;
}

export function RepoCard({ repo }: RepoCardProps) {
  const pipelineUrl = repo.pipeline ? toHttpsUrl(repo.pipeline.webUrl) : null;

  return (
    <Card title={repo.name} subtitle={repo.defaultBranch ?? "Aucune branche par défaut"}>
      <Stack gap="sm" alignItems="start">
        <PipelineBadge pipeline={repo.pipeline} />
        {pipelineUrl ? (
          <Link href={pipelineUrl} size="small">
            Voir le pipeline
          </Link>
        ) : null}
      </Stack>
    </Card>
  );
}
