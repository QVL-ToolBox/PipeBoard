import express from "express";
import type { Request, Response } from "express";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HOST = "127.0.0.1";
const PORT = 5191;

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
  console.log(`PipeBoard backend listening on http://${HOST}:${PORT}`);
});
