import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

interface DevOptions {
  port?: string;
  host?: boolean;
}

export async function devCommand(options: DevOptions = {}) {
  console.log("🚀 Starting talak-web3 development server...\n");

  // Check for package.json
  if (!fs.existsSync("package.json")) {
    console.error("❌ No package.json found. Are you in a project directory?");
    process.exit(1);
  }

  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));

  // Determine the dev command based on framework
  const devScript = packageJson.scripts?.dev;
  if (!devScript) {
    console.error("❌ No dev script found in package.json");
    process.exit(1);
  }

  // Set environment variables
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    NODE_ENV: "development",
    TALAK_DEV: "true",
  };

  if (options.port) {
    env.PORT = options.port;
  }

  if (options.host) {
    env.HOST = "0.0.0.0";
  }

  // Check for .env file
  if (!fs.existsSync(".env")) {
    console.warn("⚠️  No .env file found. Using default configuration.");
    console.log('   Run "talak doctor" to check your setup.\n');
  }

  // Start the dev server
  console.log(`📦 Package: ${packageJson.name}`);
  console.log(`🔧 Command: ${devScript}\n`);

  const [command, ...args] = devScript.split(" ");
  const child = spawn(command, args, {
    stdio: "inherit",
    env,
    shell: true,
  });

  child.on("error", (error) => {
    console.error(`❌ Failed to start: ${error.message}`);
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      console.log(`\n⚠️  Dev server exited with code ${code}`);
    }
  });

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n\n👋 Shutting down development server...");
    child.kill("SIGINT");
  });

  process.on("SIGTERM", () => {
    child.kill("SIGTERM");
  });
}
