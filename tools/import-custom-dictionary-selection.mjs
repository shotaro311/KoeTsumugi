import { copyFileSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

function fail(message) {
  throw new Error(message);
}

function normalizeOutput(value) {
  return value.trim().toLocaleLowerCase("en-US");
}

function normalizeAlias(value) {
  return value.trim().toLocaleLowerCase("ja-JP");
}

function validateEntry(entry, source) {
  if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
    fail(`${source}: entry must be an object`);
  }

  if (typeof entry.output !== "string" || entry.output.trim() === "") {
    fail(`${source}: output must be a non-empty string`);
  }

  if (!Array.isArray(entry.aliases)) {
    fail(`${source}: aliases must be an array`);
  }

  const output = entry.output.trim();
  const aliases = [];
  const seenAliases = new Set();

  for (const aliasValue of entry.aliases) {
    if (typeof aliasValue !== "string" || aliasValue.trim() === "") {
      fail(`${source}: every alias must be a non-empty string`);
    }

    const alias = aliasValue.trim();
    const normalized = normalizeAlias(alias);
    if (normalized === normalizeAlias(output) || seenAliases.has(normalized)) {
      continue;
    }

    seenAliases.add(normalized);
    aliases.push(alias);
  }

  if (typeof entry.use_in_model_prompt !== "boolean") {
    fail(`${source}: use_in_model_prompt must be a boolean`);
  }

  if (typeof entry.use_in_post_process !== "boolean") {
    fail(`${source}: use_in_post_process must be a boolean`);
  }

  return {
    output,
    aliases,
    use_in_model_prompt: entry.use_in_model_prompt,
    use_in_post_process: entry.use_in_post_process,
  };
}

function validateEntries(entries, source) {
  if (!Array.isArray(entries)) {
    fail(`${source}: entries must be an array`);
  }

  const validated = [];
  const outputs = new Set();

  for (const [index, entry] of entries.entries()) {
    const value = validateEntry(entry, `${source}[${index}]`);
    const normalized = normalizeOutput(value.output);
    if (outputs.has(normalized)) {
      fail(`${source}: duplicate output: ${value.output}`);
    }

    outputs.add(normalized);
    validated.push(value);
  }

  return validated;
}

function mergeEntries(existingEntries, importedEntries) {
  const importedByOutput = new Map(
    importedEntries.map((entry) => [normalizeOutput(entry.output), entry]),
  );
  const merged = existingEntries.map(
    (entry) => importedByOutput.get(normalizeOutput(entry.output)) ?? entry,
  );
  const existingOutputs = new Set(
    existingEntries.map((entry) => normalizeOutput(entry.output)),
  );

  for (const entry of importedEntries) {
    if (!existingOutputs.has(normalizeOutput(entry.output))) {
      merged.push(entry);
    }
  }

  return merged;
}

function validateAliasConflicts(entries) {
  const owners = new Map();

  for (const entry of entries) {
    for (const alias of entry.aliases) {
      const normalized = normalizeAlias(alias);
      const owner = owners.get(normalized);
      if (owner !== undefined && owner !== entry.output) {
        fail(
          `alias conflict: ${alias} is used by ${owner} and ${entry.output}`,
        );
      }
      owners.set(normalized, entry.output);
    }
  }
}

function timestampForFilename() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply");
const positional = args.filter((argument) => !argument.startsWith("--"));

if (positional.length !== 2) {
  fail(
    "usage: import-custom-dictionary-selection.mjs [--apply] <selection.json> <settings_store.json>",
  );
}

const [selectionPath, settingsPath] = positional;
const selection = JSON.parse(readFileSync(selectionPath, "utf8"));
const settingsRoot = JSON.parse(readFileSync(settingsPath, "utf8"));

if (selection === null || typeof selection !== "object") {
  fail("selection root must be an object");
}
if (!Array.isArray(selection.excluded)) {
  fail("selection.excluded must be an array");
}
if (
  settingsRoot?.settings === null ||
  typeof settingsRoot?.settings !== "object"
) {
  fail("settings root does not contain a settings object");
}

const importedEntries = validateEntries(selection.entries, "selection.entries");
const existingEntries = validateEntries(
  settingsRoot.settings.custom_words ?? [],
  "settings.custom_words",
);
const mergedEntries = mergeEntries(existingEntries, importedEntries);
validateAliasConflicts(mergedEntries);

const editedOutputs = Object.keys(selection.alias_overrides ?? {});
const summary = {
  applied: shouldApply,
  existing_count: existingEntries.length,
  imported_count: importedEntries.length,
  excluded_count: selection.excluded.length,
  edited_output_count: editedOutputs.length,
  final_count: mergedEntries.length,
  preserved_existing_outputs: existingEntries
    .filter(
      (entry) =>
        !importedEntries.some(
          (imported) =>
            normalizeOutput(imported.output) === normalizeOutput(entry.output),
        ),
    )
    .map((entry) => entry.output),
};

if (shouldApply) {
  const backupPath = `${settingsPath}.backup-${timestampForFilename()}`;
  const temporaryPath = join(
    dirname(settingsPath),
    `.${basename(settingsPath)}.tmp-${Date.now()}`,
  );

  copyFileSync(settingsPath, backupPath);
  settingsRoot.settings.custom_words = mergedEntries;
  writeFileSync(
    temporaryPath,
    `${JSON.stringify(settingsRoot, null, 2)}\n`,
    "utf8",
  );
  renameSync(temporaryPath, settingsPath);
  summary.backup_path = backupPath;
}

console.log(JSON.stringify(summary, null, 2));
