import { execSync } from "node:child_process";

// OpenNext runs `npm run build` after setting NEXT_PRIVATE_STANDALONE.
// On Workers CI, the outer `npm run build` must run OpenNext once; inner calls run Next only.
const isOpenNextInnerBuild = process.env.NEXT_PRIVATE_STANDALONE === "true";
const isWorkersCi = process.env.WORKERS_CI === "1";

const command = isOpenNextInnerBuild || !isWorkersCi
  ? "npx next build"
  : "npx opennextjs-cloudflare build";

execSync(command, { stdio: "inherit" });
