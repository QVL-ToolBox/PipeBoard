import express from "express";
import type { NextFunction, Request, Response } from "express";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createApiRouter } from "./routes.ts";

const HOST = "127.0.0.1";
const PORT = 5191;

const serverDir = dirname(fileURLToPath(import.meta.url));
const clientBuildDir = resolve(serverDir, "..", "dist");
const clientEntry = resolve(clientBuildDir, "index.html");

const isProduction = process.env.NODE_ENV === "production";

const app = express();

app.use(express.json());

app.use("/api", createApiRouter());

app.all("/api/{*splat}", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

if (isProduction) {
  app.use(express.static(clientBuildDir));
  app.get("/{*splat}", (_req: Request, res: Response) => {
    res.sendFile(clientEntry);
  });
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof SyntaxError) {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(PORT, HOST, () => {
  console.log(`PipeBoard backend listening on http://${HOST}:${PORT}`);
});
