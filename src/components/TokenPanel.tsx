import { Button, Card, Feedback, InputPassword, Stack } from "canopui";
import { useState, type FormEventHandler } from "react";
import { submitToken } from "../api";

export interface TokenPanelProps {
  onConfigured: () => void;
}

export function TokenPanel({ onConfigured }: TokenPanelProps) {
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();
    if (token.trim() === "" || submitting) return;

    setSubmitting(true);
    setFailed(false);
    submitToken(token)
      .then(() => {
        setToken("");
        onConfigured();
      })
      .catch(() => {
        setToken("");
        setFailed(true);
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <Card
      title="Configurer l’accès GitLab"
      subtitle="Renseignez un jeton d’accès personnel avec le scope read_api."
    >
      <Stack as="form" gap="md" onSubmit={handleSubmit}>
        <InputPassword
          label="Jeton d’accès personnel GitLab"
          name="gitlab-token"
          autoComplete="off"
          value={token}
          onChange={setToken}
        />
        {failed ? (
          <Feedback severity="error">
            Jeton refusé ou serveur injoignable. Vérifiez le jeton et réessayez.
          </Feedback>
        ) : null}
        <Stack direction="row" justifyContent="end">
          <Button type="submit" loading={submitting} disabled={token.trim() === ""}>
            Enregistrer le jeton
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
