import { Button, DescriptionList, Feedback, Stack, type ChDescriptionItem } from "canopui";
import type { PipelinesResponse, StatusResponse } from "../types";
import { GroupSection } from "./GroupSection";

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "short",
  timeStyle: "medium",
});

function formatTimestamp(value: string | null): string {
  if (!value) return "Jamais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Inconnu";
  return dateTimeFormatter.format(date);
}

export interface DashboardProps {
  status: StatusResponse;
  data: PipelinesResponse | null;
  disconnecting: boolean;
  onDisconnect: () => void;
}

export function Dashboard({ status, data, disconnecting, onDisconnect }: DashboardProps) {
  const freshnessItems: ChDescriptionItem[] = [
    { label: "Dernière collecte des dépôts", value: formatTimestamp(status.lastListingRefresh) },
    { label: "Dernière actualisation des statuts", value: formatTimestamp(status.lastStatusRefresh) },
  ];
  const isEmpty = data !== null && data.groups.length === 0;

  return (
    <Stack gap="lg">
      <Stack direction="row" justifyContent="space-between" alignItems="center" wrap gap="md">
        <DescriptionList items={freshnessItems} />
        <Button
          variant="secondary"
          size="small"
          loading={disconnecting}
          onClick={onDisconnect}
        >
          Déconnecter le jeton
        </Button>
      </Stack>
      {isEmpty ? (
        <Feedback severity="info">
          En attente de la première collecte : le listing des dépôts peut prendre quelques secondes.
        </Feedback>
      ) : (
        data?.groups.map((group) => <GroupSection key={group.group} group={group} />)
      )}
    </Stack>
  );
}
