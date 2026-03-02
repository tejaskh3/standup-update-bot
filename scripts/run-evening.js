import "dotenv/config";
import { createSlackApp } from "../src/slack.js";
import { shouldRunEveningJob, runEveningJob } from "../src/eveningJob.js";

async function main() {
  const status = shouldRunEveningJob();
  if (!status.run) {
    console.log("[evening] Skipping -", status.reason);
    process.exit(0);
  }

  const app = createSlackApp();
  await app.start();
  try {
    await runEveningJob(app);
  } finally {
    await app.stop();
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
