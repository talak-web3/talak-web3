const fs = require("fs");
const path = require("path");

// Simple build script that copies src to dist
const srcDir = path.join(__dirname, "src");
const distDir = path.join(__dirname, "dist");

// Clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}

// Create dist directory
fs.mkdirSync(distDir, { recursive: true });

// Copy all TypeScript files as JavaScript files
function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      const content = fs.readFileSync(srcPath, "utf8");
      // Change .ts extension to .js for non-declaration files
      if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
        const newFileName = entry.name.replace(".ts", ".js");
        fs.writeFileSync(path.join(dest, newFileName), content);
      } else {
        fs.writeFileSync(destPath, content);
      }
    }
  }
}

copyDirectory(srcDir, distDir);
console.log("Build completed successfully!");
