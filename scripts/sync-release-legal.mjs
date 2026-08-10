import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const legalDirectory = path.join(
  projectRoot,
  "src-tauri",
  "resources",
  "legal",
);

const files = [
  ["LICENSE", "KOETSUMUGI_MIT_LICENSE.txt"],
  ["THIRD_PARTY_NOTICES.md", "THIRD_PARTY_NOTICES.md"],
  [
    "docs/generated/THIRD_PARTY_LICENSE_INVENTORY.md",
    "THIRD_PARTY_LICENSE_INVENTORY.md",
  ],
  [
    "docs/generated/THIRD_PARTY_LICENSE_TEXTS.txt",
    "THIRD_PARTY_LICENSE_TEXTS.txt",
  ],
];

await mkdir(legalDirectory, { recursive: true });
for (const [source, destination] of files) {
  await copyFile(
    path.join(projectRoot, source),
    path.join(legalDirectory, destination),
  );
}

console.log(`Synchronized ${files.length} legal files into ${legalDirectory}`);
