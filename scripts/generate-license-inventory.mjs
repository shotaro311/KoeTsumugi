import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const cargoDirectory = path.join(projectRoot, "src-tauri");
const outputPath = path.join(
  projectRoot,
  "docs",
  "generated",
  "THIRD_PARTY_LICENSE_INVENTORY.md",
);
const licenseTextsPath = path.join(
  projectRoot,
  "docs",
  "generated",
  "THIRD_PARTY_LICENSE_TEXTS.txt",
);

const cargoProcess = Bun.spawnSync(
  [
    "cargo",
    "metadata",
    "--locked",
    "--format-version",
    "1",
    "--filter-platform",
    "x86_64-pc-windows-msvc",
  ],
  {
    cwd: cargoDirectory,
    stdout: "pipe",
    stderr: "inherit",
  },
);

if (cargoProcess.exitCode !== 0) {
  throw new Error("cargo metadata failed");
}

const cargoMetadata = JSON.parse(cargoProcess.stdout.toString());
const workspaceMembers = new Set(cargoMetadata.workspace_members);
const rustPackages = cargoMetadata.packages
  .filter((item) => !workspaceMembers.has(item.id))
  .map((item) => ({
    ecosystem: "Rust",
    name: item.name,
    version: item.version,
    license: item.license ?? "REVIEW REQUIRED",
    authors: item.authors,
    source:
      item.repository ??
      `https://crates.io/crates/${encodeURIComponent(item.name)}/${encodeURIComponent(item.version)}`,
    directory: path.dirname(item.manifest_path),
  }));

const packageJsonPaths = [];
const bunStore = path.join(projectRoot, "node_modules", ".bun");

async function collectPackageJsonFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectPackageJsonFiles(entryPath);
    } else if (entry.name === "package.json") {
      packageJsonPaths.push(entryPath);
    }
  }
}

await collectPackageJsonFiles(bunStore);

function normalizeLicense(value) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const values = value.map(normalizeLicense).filter(Boolean);
    return values.length > 0 ? values.join(" OR ") : "REVIEW REQUIRED";
  }
  if (value && typeof value === "object" && typeof value.type === "string") {
    return value.type;
  }
  return "REVIEW REQUIRED";
}

function normalizeRepository(value) {
  const raw = typeof value === "string" ? value : value?.url;
  if (!raw) return null;
  return raw
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/\.git$/, "");
}

const javascriptPackages = [];
for (const packageJsonPath of packageJsonPaths) {
  let manifest;
  try {
    manifest = JSON.parse(await readFile(packageJsonPath, "utf8"));
  } catch {
    continue;
  }
  if (!manifest.name || !manifest.version) continue;
  javascriptPackages.push({
    ecosystem: "JavaScript",
    name: manifest.name,
    version: manifest.version,
    license: normalizeLicense(manifest.license ?? manifest.licenses),
    authors: [
      typeof manifest.author === "string"
        ? manifest.author
        : manifest.author?.name,
    ].filter(Boolean),
    source:
      normalizeRepository(manifest.repository) ??
      manifest.homepage ??
      `https://www.npmjs.com/package/${encodeURIComponent(manifest.name)}/v/${encodeURIComponent(manifest.version)}`,
    directory: path.dirname(packageJsonPath),
  });
}

const packages = [...rustPackages, ...javascriptPackages]
  .filter(
    (item, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.ecosystem === item.ecosystem &&
          candidate.name === item.name &&
          candidate.version === item.version,
      ) === index,
  )
  .sort((left, right) =>
    `${left.ecosystem}:${left.name}:${left.version}`.localeCompare(
      `${right.ecosystem}:${right.name}:${right.version}`,
    ),
  );

const reviewRequired = packages.filter(
  (item) => item.license === "REVIEW REQUIRED",
);

const licenseFilePattern = /^(licen[cs]e|copying|notice|unlicense)([-._].*)?$/i;
const licenseGroups = new Map();
const packagesWithoutLicenseFiles = [];

for (const item of packages) {
  const entries = await readdir(item.directory, { withFileTypes: true });
  const licenseFiles = entries.filter(
    (entry) =>
      (entry.isFile() || entry.isSymbolicLink()) &&
      licenseFilePattern.test(entry.name),
  );

  if (licenseFiles.length === 0) {
    packagesWithoutLicenseFiles.push(item);
    continue;
  }

  for (const licenseFile of licenseFiles) {
    const text = (
      await readFile(path.join(item.directory, licenseFile.name), "utf8")
    )
      .replaceAll("\r\n", "\n")
      .trim();
    if (!text) continue;
    const hash = createHash("sha256").update(text).digest("hex");
    const existing = licenseGroups.get(hash) ?? {
      text,
      packages: [],
      filenames: new Set(),
    };
    existing.packages.push(`${item.ecosystem} ${item.name} ${item.version}`);
    existing.filenames.add(licenseFile.name);
    licenseGroups.set(hash, existing);
  }
}

const generatedAt = new Date().toISOString();
const lines = [
  "# Windows x64 third-party license inventory",
  "",
  `Generated from the locked Windows x64 Rust and Bun dependency trees at ${generatedAt}.`,
  "This inventory records declared license metadata; it does not replace the corresponding license texts or a release-specific legal review.",
  "",
  `- Rust and JavaScript packages: ${packages.length}`,
  `- Packages requiring manual license review: ${reviewRequired.length}`,
  `- Packages with locally collected license/notice files: ${packages.length - packagesWithoutLicenseFiles.length}`,
  `- Packages without a locally collected license/notice file: ${packagesWithoutLicenseFiles.length}`,
  "",
  "| Ecosystem | Package | Version | Declared license | Source |",
  "| --- | --- | --- | --- | --- |",
  ...packages.map(
    (item) =>
      `| ${item.ecosystem} | ${item.name.replaceAll("|", "\\|")} | ${item.version} | ${item.license.replaceAll("|", "\\|")} | [source](${item.source}) |`,
  ),
  ...(packagesWithoutLicenseFiles.length > 0
    ? [
        "",
        "## Packages without a local license/notice file",
        "",
        ...packagesWithoutLicenseFiles.flatMap((item) => [
          `- ${item.ecosystem} ${item.name} ${item.version} (${item.license})`,
          ...(item.authors.length > 0
            ? [`  Authors: ${item.authors.join(", ")}`]
            : []),
        ]),
      ]
    : []),
  "",
];

const licenseTextLines = [
  "KoeTsumugi Windows x64 third-party license and notice texts",
  `Generated at ${generatedAt} from locked Windows x64 Cargo and Bun package contents.`,
  "See THIRD_PARTY_LICENSE_INVENTORY.md for package source URLs and declared license expressions.",
  "",
  `Packages covered by local license/notice files: ${packages.length - packagesWithoutLicenseFiles.length}`,
  `Packages without a local license/notice file: ${packagesWithoutLicenseFiles.length}`,
  "",
  ...(packagesWithoutLicenseFiles.length > 0
    ? [
        "Packages without a package-local license file retain their declared license expression, source URL, and manifest authors in the inventory. Their license families are also represented by texts collected from other locked packages, but they remain listed for release review.",
        "",
      ]
    : []),
  ...[...licenseGroups.entries()].flatMap(([hash, group], index) => [
    "=".repeat(79),
    `Text ${index + 1} (SHA-256 ${hash.toUpperCase()})`,
    `Files: ${[...group.filenames].sort().join(", ")}`,
    "Packages:",
    ...[...new Set(group.packages)].sort().map((item) => `- ${item}`),
    "-".repeat(79),
    group.text,
    "",
  ]),
];

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, lines.join("\n"), "utf8");
await writeFile(licenseTextsPath, licenseTextLines.join("\n"), "utf8");

console.log(
  `Wrote third-party inventory and ${licenseGroups.size} unique license/notice texts for ${packages.length} packages (${reviewRequired.length} requiring review, ${packagesWithoutLicenseFiles.length} without a local text).`,
);
