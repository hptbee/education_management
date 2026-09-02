import { execSync } from "node:child_process";

const isWorkersCi = process.env.WORKERS_CI === "1";
const command = isWorkersCi
  ? "npx opennextjs-cloudflare build"
  : "npx next build";

execSync(command, { stdio: "inherit" });
