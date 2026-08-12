import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { format, resolveConfig } from "prettier";

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

const releaseTargets = new Map([
  ["x86_64-pc-windows-msvc", "Windows x64"],
  ["aarch64-apple-darwin", "macOS arm64"],
]);

const licenseOverrides = new Map([
  [
    "Rust:tauri-nspanel:2.1.0",
    {
      license: "MIT OR Apache-2.0",
      note: "The locked source revision contains LICENSE_MIT and LICENSE_APACHE-2.0.",
      source:
        "https://github.com/ahkohd/tauri-nspanel/tree/da9c9a8d4eb7f0524a2508988df1a7d9585b4904",
    },
  ],
]);

const rustPackageMap = new Map();
for (const [target, platformLabel] of releaseTargets) {
  const cargoProcess = Bun.spawnSync(
    [
      "cargo",
      "metadata",
      "--locked",
      "--format-version",
      "1",
      "--filter-platform",
      target,
    ],
    {
      cwd: cargoDirectory,
      stdout: "pipe",
      stderr: "inherit",
    },
  );

  if (cargoProcess.exitCode !== 0) {
    throw new Error(`cargo metadata failed for ${target}`);
  }

  const cargoMetadata = JSON.parse(cargoProcess.stdout.toString());
  const workspaceMembers = new Set(cargoMetadata.workspace_members);
  for (const item of cargoMetadata.packages) {
    if (workspaceMembers.has(item.id)) continue;
    const key = `Rust:${item.name}:${item.version}`;
    const override = licenseOverrides.get(key);
    const existing = rustPackageMap.get(key) ?? {
      ecosystem: "Rust",
      name: item.name,
      version: item.version,
      license: override?.license ?? item.license ?? "REVIEW REQUIRED",
      licenseNote: override?.note ?? null,
      authors: item.authors,
      source:
        override?.source ??
        item.repository ??
        `https://crates.io/crates/${encodeURIComponent(item.name)}/${encodeURIComponent(item.version)}`,
      directory: path.dirname(item.manifest_path),
      platforms: new Set(),
    };
    existing.platforms.add(platformLabel);
    rustPackageMap.set(key, existing);
  }
}

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
    licenseNote: null,
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
    platforms: new Set(["Windows x64", "macOS arm64"]),
  });
}

const packages = [...rustPackageMap.values(), ...javascriptPackages]
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
if (reviewRequired.length > 0) {
  throw new Error(
    `Manual license review required for: ${reviewRequired
      .map((item) => `${item.ecosystem} ${item.name} ${item.version}`)
      .join(", ")}`,
  );
}

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
      .replace(/[ \t]+$/gm, "")
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
  "# Windows x64 and macOS arm64 third-party license inventory",
  "",
  `Generated from the locked Windows x64, macOS arm64, and Bun dependency trees at ${generatedAt}.`,
  "This inventory records declared license metadata; it does not replace the corresponding license texts or a release-specific legal review.",
  "",
  `- Rust and JavaScript packages: ${packages.length}`,
  `- Packages requiring manual license review: ${reviewRequired.length}`,
  `- Packages with locally collected license/notice files: ${packages.length - packagesWithoutLicenseFiles.length}`,
  `- Packages without a locally collected license/notice file: ${packagesWithoutLicenseFiles.length}`,
  "",
  "| Ecosystem | Package | Version | Release platforms | Declared license | Source |",
  "| --- | --- | --- | --- | --- | --- |",
  ...packages.map(
    (item) =>
      `| ${item.ecosystem} | ${item.name.replaceAll("|", "\\|")} | ${item.version} | ${[...item.platforms].sort().join(", ")} | ${item.license.replaceAll("|", "\\|")} | [source](${item.source}) |`,
  ),
  ...(licenseOverrides.size > 0
    ? [
        "",
        "## Verified manifest license overrides",
        "",
        ...packages
          .filter((item) => item.licenseNote)
          .map(
            (item) =>
              `- ${item.ecosystem} ${item.name} ${item.version}: ${item.license}. ${item.licenseNote}`,
          ),
      ]
    : []),
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
  "KoeTsumugi Windows x64 and macOS arm64 third-party license and notice texts",
  `Generated at ${generatedAt} from locked Windows x64, macOS arm64, and Bun package contents.`,
  "See THIRD_PARTY_LICENSE_INVENTORY.md for package source URLs, release platforms, and declared license expressions.",
  "",
  `Packages covered by local license/notice files: ${packages.length - packagesWithoutLicenseFiles.length}`,
  `Packages without a package-local license file: ${packagesWithoutLicenseFiles.length}`,
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

const prettierConfig = (await resolveConfig(outputPath)) ?? {};
const formattedInventory = await format(lines.join("\n"), {
  ...prettierConfig,
  parser: "markdown",
});
const licenseTexts = licenseTextLines.join("\n");

await writeFile(outputPath, formattedInventory, "utf8");
await writeFile(licenseTextsPath, licenseTexts, "utf8");

console.log(
  `Wrote release-platform inventory and ${licenseGroups.size} unique license/notice texts for ${packages.length} packages (${reviewRequired.length} requiring review, ${packagesWithoutLicenseFiles.length} without a local text).`,
);
