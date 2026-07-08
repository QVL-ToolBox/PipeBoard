import {
  ChThemeProvider,
  Feedback,
  Legend,
  PageContent,
  PageScaffold,
  Spinner,
  Stack,
  type ChLegendEntry,
  type ChNavbarItem,
} from "canopui";
import "canopui/styles.css";
import { useState, type ReactNode } from "react";
import { deleteToken } from "./api";
import { Dashboard } from "./components/Dashboard";
import { TokenPanel } from "./components/TokenPanel";
import { usePipelines } from "./usePipelines";

const navbarItems: ChNavbarItem[] = [];

const legendItems: ChLegendEntry[] = [
  { status: "success", label: "Réussi" },
  { status: "error", label: "Échoué" },
  { status: "warning", label: "Manuel / planifié" },
  { status: "neutral", label: "Annulé / ignoré / aucun pipeline" },
];

export function App() {
  const { status, data, loading, error, refresh } = usePipelines();
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = () => {
    setDisconnecting(true);
    deleteToken()
      .catch(() => undefined)
      .finally(() => {
        setDisconnecting(false);
        refresh();
      });
  };

  let mainContent: ReactNode = null;
  if (loading && !status) {
    mainContent = (
      <Stack alignItems="center" padding="lg">
        <Spinner size="large" label="Chargement des pipelines" />
      </Stack>
    );
  } else if (status && !status.tokenSet) {
    mainContent = <TokenPanel onConfigured={refresh} />;
  } else if (status) {
    mainContent = (
      <Dashboard
        status={status}
        data={data}
        disconnecting={disconnecting}
        onDisconnect={handleDisconnect}
      />
    );
  }

  return (
    <ChThemeProvider defaultMode="system">
      <PageScaffold title="PipeBoard" items={navbarItems}>
        <PageContent>
          <Legend items={legendItems} />
          {status?.rateLimited ? (
            <Feedback severity="warning">
              Limite d’appels de l’API GitLab atteinte : les statuts peuvent être temporairement
              figés.
            </Feedback>
          ) : null}
          {error ? (
            <Feedback severity="error">
              Impossible de contacter le serveur PipeBoard. Nouvelle tentative automatique en cours.
            </Feedback>
          ) : null}
          {mainContent}
        </PageContent>
      </PageScaffold>
    </ChThemeProvider>
  );
}
