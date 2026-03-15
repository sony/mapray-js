import fs from "node:fs";
import path from "node:path";


function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".d.ts")) {
      continue;
    }

    const source = fs.readFileSync(fullPath, "utf8");
    let normalized = source.replace(/\bconst enum\b/g, "enum");

    if (normalized !== source) {
      fs.writeFileSync(fullPath, normalized);
    }
  }
}


for (const target of process.argv.slice(2)) {
  if (!fs.existsSync(target)) {
    continue;
  }

  walk(target);
}
