import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export type GroupReference = number | string;

export interface GroupsConfig {
  groups: GroupReference[];
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const serverDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDir, "..");
const configPath = resolve(projectRoot, "groups.json");

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function readConfigFileContent(): string {
  try {
    return readFileSync(configPath, "utf-8");
  } catch (error) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      throw new ConfigError(
        `Fichier introuvable: ${configPath}\n` +
          `Copiez groups.json.example vers groups.json a la racine du projet, ` +
          `puis renseignez les groups GitLab a surveiller.`,
      );
    }
    const detail = error instanceof Error ? error.message : String(error);
    throw new ConfigError(`Fichier illisible: ${detail}`);
  }
}

function parseConfigContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new ConfigError(
      `groups.json ne contient pas du JSON valide (${detail}).\n` +
        `Corrigez la syntaxe ou repartez de groups.json.example.`,
    );
  }
}

function validateGroupReference(entry: unknown, index: number): GroupReference {
  if (typeof entry === "number") {
    if (!Number.isInteger(entry) || entry <= 0) {
      throw new ConfigError(
        `groups[${index}]: id numerique invalide (${entry}), attendu un entier positif.`,
      );
    }
    return entry;
  }
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      throw new ConfigError(`groups[${index}]: le path ne peut pas etre vide.`);
    }
    return trimmed;
  }
  throw new ConfigError(
    `groups[${index}]: type invalide, attendu un id numerique ou un path ` +
      `(ex. "mon-orga/mon-group").`,
  );
}

function dedupeGroups(groups: GroupReference[]): GroupReference[] {
  const seen = new Set<string>();
  const result: GroupReference[] = [];
  for (const group of groups) {
    const key = String(group);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(group);
  }
  return result;
}

function validateConfig(data: unknown): GroupsConfig {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new ConfigError(`La racine du fichier doit etre un objet { "groups": [...] }.`);
  }
  const groups = (data as Record<string, unknown>).groups;
  if (!Array.isArray(groups)) {
    throw new ConfigError(`Le champ "groups" est manquant ou n'est pas un tableau.`);
  }
  if (groups.length === 0) {
    throw new ConfigError(`Le champ "groups" est vide: renseignez au moins un group GitLab.`);
  }
  return { groups: dedupeGroups(groups.map(validateGroupReference)) };
}

export function loadGroupsConfig(): GroupsConfig {
  return validateConfig(parseConfigContent(readConfigFileContent()));
}
