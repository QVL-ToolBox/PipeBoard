import { Button, Feedback, Stack } from "canopui";
import { TokenPanel } from "./TokenPanel";

export interface ConfigurationPageProps {
  tokenSet: boolean;
  disconnecting: boolean;
  onConfigured: () => void;
  onDisconnect: () => void;
}

export function ConfigurationPage({
  tokenSet,
  disconnecting,
  onConfigured,
  onDisconnect,
}: ConfigurationPageProps) {
  return (
    <Stack gap="lg">
      <Feedback severity={tokenSet ? "success" : "info"}>
        {tokenSet ? "Un jeton GitLab est actif." : "Aucun jeton GitLab configuré."}
      </Feedback>
      <TokenPanel onConfigured={onConfigured} />
      {tokenSet ? (
        <Stack direction="row" justifyContent="start">
          <Button variant="secondary" loading={disconnecting} onClick={onDisconnect}>
            Déconnecter le jeton
          </Button>
        </Stack>
      ) : null}
    </Stack>
  );
}
