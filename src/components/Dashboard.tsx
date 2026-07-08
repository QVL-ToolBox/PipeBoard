import {
  Button,
  DescriptionList,
  Feedback,
  Icon,
  Legend,
  Stack,
  type ChDescriptionItem,
  type ChLegendEntry,
} from "canopui";
import type { ReactNode } from "react";
import type { PipelinesResponse, StatusResponse } from "../types";
import { GroupSection } from "./GroupSection";

const legendItems: ChLegendEntry[] = [
  { status: "success", label: "Réussi" },
  { status: "error", label: "Échoué" },
  { status: "warning", label: "Manuel / planifié" },
  { status: "neutral", label: "Annulé / ignoré" },
];

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
  refreshing: boolean;
  refreshFailed: boolean;
  onRefresh: () => void;
  onGoToConfig: () => void;
}

export function Dashboard({
  status,
  data,
  refreshing,
  refreshFailed,
  onRefresh,
  onGoToConfig,
}: DashboardProps) {
  if (!status.tokenSet) {
    return (
      <Stack gap="md" alignItems="start">
        <Feedback severity="info">
          Aucun jeton GitLab n’est configuré. Ajoutez-en un depuis la page Configuration pour
          afficher les pipelines.
        </Feedback>
        <Button onClick={onGoToConfig}>Aller à la configuration</Button>
      </Stack>
    );
  }

  const freshnessItems: ChDescriptionItem[] = [
    { label: "Dernière collecte des dépôts", value: formatTimestamp(status.lastListingRefresh) },
    { label: "Dernière actualisation des statuts", value: formatTimestamp(status.lastStatusRefresh) },
  ];

  const collectedGroups = data?.groups ?? [];
  const visibleGroups = collectedGroups
    .map((group) => ({ ...group, repos: group.repos.filter((repo) => repo.pipeline !== null) }))
    .filter((group) => group.repos.length > 0);

  let listing: ReactNode = null;
  if (data !== null) {
    if (collectedGroups.length === 0) {
      listing = (
        <Feedback severity="info">
          En attente de la première collecte : le listing des dépôts peut prendre quelques secondes.
        </Feedback>
      );
    } else if (visibleGroups.length === 0) {
      listing = <Feedback severity="info">Aucun pipeline à afficher pour le moment.</Feedback>;
    } else {
      listing = visibleGroups.map((group) => <GroupSection key={group.group} group={group} />);
    }
  }

  return (
    <Stack gap="lg">
      <Stack direction="row" justifyContent="space-between" alignItems="center" wrap gap="md">
        <DescriptionList items={freshnessItems} />
        <Button
          variant="secondary"
          size="small"
          loading={refreshing}
          onClick={onRefresh}
          startIcon={<Icon name="refresh" size="sm" />}
        >
          Actualiser
        </Button>
      </Stack>
      <Legend items={legendItems} />
      {refreshFailed ? (
        <Feedback severity="error">
          Impossible de lancer l’actualisation. Veuillez réessayer.
        </Feedback>
      ) : null}
      {listing}
    </Stack>
  );
}
