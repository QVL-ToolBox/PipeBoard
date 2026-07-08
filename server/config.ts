import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

export type GroupReference = number | string;

export interface GroupsConfig {
  groups: GroupReference[];
}

const serverDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(serverDir, "..");
const configPath = resolve(projectRoot, "groups.json");

function failStartup(message: string): never {
  console.error(`[PipeBoard] Configuration des groups invalide.\n${message}`);
  process.exit(1);
}

function readConfigFileContent(): string {
  try {
    return readFileSync(configPath, "utf-8");
  } catch {
    return failStartup(
      `Fichier introuvable: ${configPath}\n` +
        `Copiez groups.json.example vers groups.json a la racine du projet, ` +
        `puis renseignez les groups GitLab a surveiller.`,
    );
  }
}

function parseConfigContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return failStartup(
      `groups.json ne contient pas du JSON valide (${detail}).\n` +
        `Corrigez la syntaxe ou repartez de groups.json.example.`,
    );
  }
}

function validateGroupReference(entry: unknown, index: number): GroupReference {
  if (typeof entry === "number") {
    if (!Number.isInteger(entry) || entry <= 0) {
      failStartup(
        `groups[${index}]: id numerique invalide (${entry}), attendu un entier positif.`,
      );
    }
    return entry;
  }
  if (typeof entry === "string") {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      failStartup(`groups[${index}]: le path ne peut pas etre vide.`);
    }
    return trimmed;
  }
  return failStartup(
    `groups[${index}]: type invalide, attendu un id numerique ou un path ` +
      `(ex. "mon-orga/mon-group").`,
  );
}

function validateConfig(data: unknown): GroupsConfig {
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    failStartup(`La racine du fichier doit etre un objet { "groups": [...] }.`);
  }
  const groups = (data as Record<string, unknown>).groups;
  if (!Array.isArray(groups)) {
    failStartup(`Le champ "groups" est manquant ou n'est pas un tableau.`);
  }
  if (groups.length === 0) {
    failStartup(`Le champ "groups" est vide: renseignez au moins un group GitLab.`);
  }
  return { groups: groups.map(validateGroupReference) };
}

export function loadGroupsConfig(): GroupsConfig {
  return validateConfig(parseConfigContent(readConfigFileContent()));
}
