import "dotenv/config";
import { createSlackApp } from "../src/slack.js";
import { shouldRunPostJob, runPostJob } from "../src/postJob.js";

const today = process.argv.includes("--today");

async function main() {
  const status = shouldRunPostJob({ today });
  if (!status.run) {
    console.log("[post] Skipping -", status.reason);
    process.exit(0);
  }

  const app = createSlackApp();
  await app.start();
  try {
    await runPostJob(app, { today });
  } finally {
    await app.stop();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
