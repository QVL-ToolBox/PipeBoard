import { CardGrid, Heading, Stack } from "canopui";
import type { Group } from "../types";
import { RepoCard } from "./RepoCard";

export interface GroupSectionProps {
  group: Group;
}

export function GroupSection({ group }: GroupSectionProps) {
  return (
    <Stack as="section" gap="sm">
      <Heading level={2} size={4}>
        {group.name}
      </Heading>
      <CardGrid minItemWidth="15rem">
        {group.repos.map((repo) => (
          <RepoCard key={repo.id} repo={repo} />
        ))}
      </CardGrid>
    </Stack>
  );
}
