import fs from "node:fs";
import path from "node:path";

interface DepsOptions {
  project?: string;
}

function collectTalakDeps(deps: Record<string, string> | undefined): [string, string][] {
  if (!deps) return [];
  const out: [string, string][] = [];
  for (const [name, ver] of Object.entries(deps)) {
    if (name.startsWith("@talak-web3/") || name === "talak-web3") {
      out.push([name, ver]);
    }
  }
  return out.sort((a, b) => a[0].localeCompare(b[0]));
}

export async function depsCommand(options: DepsOptions = {}) {
  const projectPath = path.resolve(options.project || ".");
  const pkgPath = path.join(projectPath, "package.json");

  if (!fs.existsSync(pkgPath)) {
    console.error("No package.json in", projectPath);
    process.exit(1);
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const prod = collectTalakDeps(pkg.dependencies);
  const dev = collectTalakDeps(pkg.devDependencies);

  console.log("talak-web3-related packages in this project\n");
  console.log("  dependencies:");
  if (prod.length === 0) console.log("    (none)");
  else prod.forEach(([n, v]) => console.log(`    ${n}@${v}`));

  console.log("\n  devDependencies:");
  if (dev.length === 0) console.log("    (none)");
  else dev.forEach(([n, v]) => console.log(`    ${n}@${v}`));

  if (prod.length === 0 && dev.length === 0) {
    console.log("\n  Tip: `npm install talak-web3` or add scoped @talak-web3/* packages.");
  }
}
