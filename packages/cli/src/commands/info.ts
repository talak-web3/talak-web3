import fs from "node:fs";
import path from "node:path";

interface InfoOptions {
  project?: string;
}

export async function infoCommand(options: InfoOptions = {}) {
  const projectPath = path.resolve(options.project || ".");
  const pkgPath = path.join(projectPath, "package.json");

  console.log("talak-web3 — project info\n");
  console.log(`  cwd:     ${projectPath}`);
  console.log(`  node:    ${process.version}`);
  console.log(`  platform: ${process.platform} ${process.arch}`);

  if (!fs.existsSync(pkgPath)) {
    console.log("\n  package.json: (not found)");
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as {
    name?: string;
    version?: string;
    description?: string;
  };
  console.log(`\n  name:    ${pkg.name ?? "(unknown)"}`);
  console.log(`  version: ${pkg.version ?? "(unknown)"}`);
  if (pkg.description) console.log(`  desc:    ${pkg.description}`);
}
