import express from "express";
import type { Request, Response } from "express";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ConfigError, loadGroupsConfig } from "./config.ts";
import type { GroupsConfig } from "./config.ts";

const HOST = "127.0.0.1";
const PORT = 5191;

function loadGroupsConfigOrExit(): GroupsConfig {
  try {
    return loadGroupsConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      console.error(`[PipeBoard] Configuration des groups invalide.\n${error.message}`);
      process.exit(1);
    }
    throw error;
  }
}

const groupsConfig = loadGroupsConfigOrExit();

const serverDir = dirname(fileURLToPath(import.meta.url));
const clientBuildDir = resolve(serverDir, "..", "dist");
const clientEntry = resolve(clientBuildDir, "index.html");

const isProduction = process.env.NODE_ENV === "production";

const app = express();

app.get("/api/status", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.all("/api/{*splat}", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

if (isProduction) {
  app.use(express.static(clientBuildDir));
  app.get("/{*splat}", (_req: Request, res: Response) => {
    res.sendFile(clientEntry);
  });
}

app.listen(PORT, HOST, () => {
  console.log(
    `PipeBoard backend listening on http://${HOST}:${PORT} (${groupsConfig.groups.length} groups configures)`,
  );
});
