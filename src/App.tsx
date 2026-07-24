import {
  ChThemeProvider,
  Feedback,
  PageContent,
  PageScaffold,
  Spinner,
  Stack,
  type ChNavbarItem,
} from "canopui";
import "canopui/styles.css";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { deleteToken, triggerRefresh } from "./api";
import { ConfigurationPage } from "./components/ConfigurationPage";
import { Dashboard } from "./components/Dashboard";
import { usePipelines } from "./usePipelines";

const DASHBOARD_HREF = "/";
const CONFIG_HREF = "/configuration";
const REFRESH_SETTLE_MS = 1000;

const navbarItems: ChNavbarItem[] = [
  { label: "Tableau de bord", icon: "home", href: DASHBOARD_HREF },
  { label: "Configuration", icon: "settings", href: CONFIG_HREF },
];

export function App() {
  const { status, data, loading, error, refresh } = usePipelines();
  const [activeHref, setActiveHref] = useState(DASHBOARD_HREF);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleDisconnect = () => {
    setDisconnecting(true);
    deleteToken()
      .catch(() => undefined)
      .finally(() => {
        if (!mounted.current) return;
        setDisconnecting(false);
        refresh();
      });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshFailed(false);
    triggerRefresh()
      .then(
        () =>
          new Promise<void>((resolve) => {
            window.setTimeout(resolve, REFRESH_SETTLE_MS);
          }),
      )
      .then(() => {
        if (!mounted.current) return;
        refresh();
      })
      .catch(() => {
        if (!mounted.current) return;
        setRefreshFailed(true);
      })
      .finally(() => {
        if (mounted.current) setRefreshing(false);
      });
  };

  const goToConfig = () => setActiveHref(CONFIG_HREF);

  let mainContent: ReactNode = null;
  if (loading && !status) {
    mainContent = (
      <Stack alignItems="center" padding="lg">
        <Spinner size="large" label="Chargement des pipelines" />
      </Stack>
    );
  } else if (status && activeHref === CONFIG_HREF) {
    mainContent = (
      <ConfigurationPage
        tokenSet={status.tokenSet}
        disconnecting={disconnecting}
        onConfigured={refresh}
        onDisconnect={handleDisconnect}
      />
    );
  } else if (status) {
    mainContent = (
      <Dashboard
        status={status}
        data={data}
        refreshing={refreshing}
        refreshFailed={refreshFailed}
        onRefresh={handleRefresh}
        onGoToConfig={goToConfig}
      />
    );
  }

  return (
    <ChThemeProvider defaultMode="system">
      <PageScaffold
        navbarTitle="PipeBoard"
        items={navbarItems}
        activeHref={activeHref}
        onNavigate={setActiveHref}
      >
        <PageContent>
          {status?.rateLimited && activeHref === DASHBOARD_HREF ? (
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
