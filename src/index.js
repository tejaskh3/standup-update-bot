import "dotenv/config";
import cron from "node-cron";
import { createSlackApp } from "./slack.js";
import { setupDmHandler } from "./dmHandler.js";
import { runEveningJob } from "./eveningJob.js";
import { runPostJob } from "./postJob.js";
import { loadConfig } from "./config.js";

async function main() {
  const config = loadConfig();
  const app = createSlackApp();

  setupDmHandler(app);

  const tz = config.timezone;
  const [askH, askM] = config.askTime.split(":").map(Number);
  const [postH, postM] = config.postTime.split(":").map(Number);

  // Cron: 7 PM Mon-Fri (ask)
  cron.schedule(
    `${askM} ${askH} * * 1-5`,
    async () => {
      try {
        await runEveningJob(app);
      } catch (err) {
        console.error("[evening] Error:", err);
      }
    },
    { timezone: tz }
  );

  // Cron: 11 AM Mon-Fri (post)
  cron.schedule(
    `${postM} ${postH} * * 1-5`,
    async () => {
      try {
        await runPostJob(app);
      } catch (err) {
        console.error("[post] Error:", err);
      }
    },
    { timezone: tz }
  );

  await app.start();
  console.log("GP Bot is running. Schedule: ask", config.askTime, "Mon-Fri, post", config.postTime);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
