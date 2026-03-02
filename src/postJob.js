import { DateTime } from "luxon";
import { lastWeekday, isWeekday } from "./dates.js";
import {
  getRoundByDate,
  getResponsesForRound,
  updateRoundPosted,
} from "./db.js";
import { loadConfig } from "./config.js";

const ON_TIME = "on_time";
const LATE = "late";
const MISSED = "missed";

function classifyResponse(repliedAt, config) {
  const tz = config.timezone;
  const replied = DateTime.fromISO(repliedAt, { zone: tz });
  const [onH, onM] = config.onTimeCutoff.split(":").map(Number);
  const [postH, postM] = config.postTime.split(":").map(Number);

  // Use the post day for cutoffs - we need the round's post date
  const postDate = DateTime.now().setZone(tz);
  const onTimeCutoff = postDate.set({
    hour: onH,
    minute: onM,
    second: 0,
    millisecond: 0,
  });
  const postCutoff = postDate.set({
    hour: postH,
    minute: postM,
    second: 0,
    millisecond: 0,
  });

  if (replied < onTimeCutoff) return ON_TIME;
  if (replied < postCutoff) return LATE;
  return MISSED;
}

function formatResponse(userName, answers, questions, isLate = false) {
  const lines = questions.map((q, i) => {
    const a = answers[i] || "_—";
    return `  • ${q}\n    ${a}`;
  });
  const prefix = isLate ? "_Late update:_ " : "";
  return `${prefix}*${userName}*\n${lines.join("\n")}`;
}

import { todayInTz } from "./dates.js";

/** Returns { run: true, roundDate } or { run: false, reason } - use to avoid starting Slack when not needed */
export function shouldRunPostJob(opts = {}) {
  const config = loadConfig();
  const tz = config.timezone;
  if (!isWeekday(tz)) return { run: false, reason: "weekend" };
  const roundDate = opts.today ? todayInTz(tz) : lastWeekday(tz);
  const round = getRoundByDate.get(roundDate);
  if (!round) return { run: false, reason: `no round found for ${roundDate}` };
  if (round.posted_at) return { run: false, reason: `round already posted: ${roundDate}` };
  return { run: true, roundDate };
}

export async function runPostJob(app, opts = {}) {
  const config = loadConfig();
  const tz = config.timezone;
  const roundDate = opts.today ? todayInTz(tz) : lastWeekday(tz);

  const status = shouldRunPostJob(opts);
  if (!status.run) {
    console.log("[post] Skipping -", status.reason);
    return;
  }

  const round = getRoundByDate.get(roundDate);

  const responses = getResponsesForRound.all(round.id);
  const participantIds = JSON.parse(round.participant_ids || "[]");
  const questions = config.questions;

  const onTime = [];
  const late = [];
  const missed = [];

  for (const r of responses) {
    const classification = classifyResponse(r.replied_at, config);
    if (classification === ON_TIME) {
      onTime.push(r);
    } else if (classification === LATE) {
      late.push(r);
    } else {
      missed.push(r);
    }
  }

  // Who didn't reply at all
  const repliedUserIds = new Set(responses.map((r) => r.user_id));
  for (const uid of participantIds) {
    if (!repliedUserIds.has(uid)) {
      missed.push({ user_id: uid, answers_json: "[]", replied_at: null });
    }
  }

  // Fetch user names
  const userIdToName = {};
  for (const uid of [...new Set([...participantIds, ...responses.map((r) => r.user_id)])]) {
    try {
      const u = await app.client.users.info({ user: uid });
      userIdToName[uid] = u.user?.real_name || u.user?.name || uid;
    } catch {
      userIdToName[uid] = uid;
    }
  }

  const parts = [];

  if (onTime.length > 0) {
    parts.push(
      "*On-time updates:*\n" +
        onTime
          .map((r) => {
            const answers = JSON.parse(r.answers_json);
            return formatResponse(userIdToName[r.user_id] || r.user_id, answers, questions);
          })
          .join("\n\n")
    );
  }

  if (late.length > 0) {
    parts.push(
      "*Late updates (10:50–11 AM):*\n" +
        late
          .map((r) => {
            const answers = JSON.parse(r.answers_json);
            return formatResponse(userIdToName[r.user_id] || r.user_id, answers, questions, true);
          })
          .join("\n\n")
    );
  }

  if (missed.length > 0) {
    const names = missed.map((m) => userIdToName[m.user_id] || m.user_id);
    parts.push(`*Who missed:* ${names.join(", ")}`);
  }

  if (parts.length === 0) {
    parts.push("_No responses submitted._");
  }

  const summaryText = parts.join("\n\n" + "─".repeat(30) + "\n\n");

  let channelId = config.summaryChannel;
  if (channelId.startsWith("#")) {
    const channelName = channelId.slice(1);
    let ch = null;
    let cursor;
    do {
      const list = await app.client.conversations.list({
        types: "public_channel,private_channel",
        exclude_archived: true,
        limit: 200,
        cursor,
      });
      ch = list.channels?.find((c) => c.name === channelName || c.id === channelId);
      cursor = list.response_metadata?.next_cursor;
    } while (!ch && cursor);

    if (!ch) {
      throw new Error(
        `Channel #${channelName} not found. For private channels, invite the bot first: /invite @Daily Update Bot`
      );
    }
    channelId = ch.id;
    if (ch.is_channel) {
      try {
        await app.client.conversations.join({ channel: channelId });
      } catch (joinErr) {
        console.warn("[post] Could not auto-join channel:", joinErr.message);
      }
    }
  }

  const mainMsg = await app.client.chat.postMessage({
    channel: channelId,
    text: `Daily updates for ${roundDate}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Daily updates for ${roundDate}*`,
        },
      },
    ],
  });

  await app.client.chat.postMessage({
    channel: channelId,
    thread_ts: mainMsg.ts,
    text: summaryText,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: summaryText,
        },
      },
    ],
  });

  const now = new Date().toISOString();
  updateRoundPosted.run(now, round.id);
  console.log("[post] Posted summary for round", roundDate);
}
