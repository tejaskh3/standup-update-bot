import { todayInTz, isWeekday } from "./dates.js";
import { getRoundByDate, createRound } from "./db.js";
import { loadConfig } from "./config.js";

const DM_DELAY_MS = 1000; // 1s between DMs to avoid rate limits

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Returns { run: true } or { run: false, reason } - use to avoid starting Slack when not needed */
export function shouldRunEveningJob() {
  const config = loadConfig();
  const tz = config.timezone;
  if (!isWeekday(tz)) return { run: false, reason: "weekend" };
  const roundDate = todayInTz(tz);
  if (getRoundByDate.get(roundDate)) return { run: false, reason: `round already exists for ${roundDate}` };
  return { run: true };
}

export async function runEveningJob(app) {
  const status = shouldRunEveningJob();
  if (!status.run) {
    console.log("[evening] Skipping -", status.reason);
    return;
  }

  const config = loadConfig();
  const tz = config.timezone;
  const roundDate = todayInTz(tz);

  const participantIds = [];
  const questions = config.questions;

  for (const email of config.devs) {
    try {
      const result = await app.client.users.lookupByEmail({ email });
      if (!result.ok || !result.user) {
        console.warn("[evening] Could not resolve email:", email);
        continue;
      }
      const userId = result.user.id;
      participantIds.push(userId);

      const dm = await app.client.conversations.open({ users: userId });
      const channelId = dm.channel.id;

      const blocks = [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Daily update for ${roundDate}*\n\nPlease reply with your answers (one per line or in order):\n\n${questions.map((q, i) => `${i + 1}. ${q}`).join("\n\n")}`,
          },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "_Reply in this DM with your answers. You can reply until 10:50 AM next working day (Friday → Monday 10:50 AM)._",
          },
        },
      ];

      await app.client.chat.postMessage({
        channel: channelId,
        text: `Daily update for ${roundDate}. Please reply with your answers.`,
        blocks,
      });

      await sleep(DM_DELAY_MS);
    } catch (err) {
      console.error("[evening] Error DMing", email, err.message);
    }
  }

  const now = new Date().toISOString();
  createRound.run(roundDate, now, JSON.stringify(participantIds));
  console.log("[evening] Sent DMs for round", roundDate, "to", participantIds.length, "devs");
}
