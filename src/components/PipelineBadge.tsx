import { StatusChip, type ChStatusTone } from "canopui";
import type { Pipeline } from "../types";

const toneByStatus: Record<string, ChStatusTone> = {
  success: "success",
  failed: "error",
  running: "info",
  pending: "info",
  created: "info",
  preparing: "info",
  waiting_for_resource: "info",
  manual: "warning",
  scheduled: "warning",
  canceled: "neutral",
  skipped: "neutral",
};

const labelByStatus: Record<string, string> = {
  success: "Réussi",
  failed: "Échoué",
  running: "En cours",
  pending: "En attente",
  created: "Créé",
  preparing: "Préparation",
  waiting_for_resource: "En attente de ressource",
  manual: "Manuel",
  scheduled: "Planifié",
  canceled: "Annulé",
  skipped: "Ignoré",
};

export interface PipelineBadgeProps {
  pipeline: Pipeline | null;
}

export function PipelineBadge({ pipeline }: PipelineBadgeProps) {
  if (!pipeline) {
    return <StatusChip tone="neutral" label="Aucun pipeline" />;
  }

  const tone = toneByStatus[pipeline.status] ?? "neutral";
  const label = labelByStatus[pipeline.status] ?? pipeline.status;

  return <StatusChip tone={tone} label={label} />;
}
