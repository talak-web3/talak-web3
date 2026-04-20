// Simple build script for packages without TypeScript
const fs = require("fs");
const path = require("path");

// Clean dist directory to avoid shipping stale files (e.g. tests)
fs.rmSync("dist", { recursive: true, force: true });
fs.mkdirSync("dist", { recursive: true });

// Copy source files to dist
const srcDir = "src";
if (fs.existsSync(srcDir)) {
  const files = fs.readdirSync(srcDir);
  files.forEach((file) => {
    if (file.endsWith(".ts")) {
      const srcFile = path.join(srcDir, file);
      const destFile = path.join("dist", file.replace(".ts", ".js"));

      // Read TypeScript file
      const content = fs.readFileSync(srcFile, "utf8");

      // Simple TypeScript to JavaScript conversion (basic)
      const jsContent = content
        .replace(/export\s+type\s+/g, "// export type ")
        .replace(/:\s*[^=,){]+(?=\s*[=,){])/g, "") // Remove type annotations
        .replace(/interface\s+\w+\s*\{[^}]*\}/gs, "") // Remove interfaces
        .replace(/import\s+type\s+/g, "// import type ");

      fs.writeFileSync(destFile, jsContent);
      console.log(`Built: ${destFile}`);
    }
  });
}

console.log("Build completed successfully!");
