import { getLatestRound, upsertResponse } from "./db.js";
import { loadConfig } from "./config.js";
import { DateTime } from "luxon";

/**
 * Parse free-form reply into answers array.
 * Expects: 3 lines or "1. x\n2. y\n3. z" or similar.
 */
function parseReply(text) {
  const lines = text
    .trim()
    .split(/\n/)
    .map((l) => l.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
  const config = loadConfig();
  const expected = config.questions.length;
  if (lines.length >= expected) {
    return lines.slice(0, expected);
  }
  if (lines.length === 1 && lines[0].includes(".")) {
    return lines[0].split(/\.\s*/).slice(0, expected);
  }
  return lines;
}

export function setupDmHandler(app) {
  app.message(async ({ message, client }) => {
    if (message.channel_type !== "im") return;
    if (message.subtype === "bot_message") return;
    if (!message.text?.trim()) return;

    const userId = message.user;
    const round = getLatestRound.get();
    if (!round || round.posted_at) {
      await client.chat.postMessage({
        channel: message.channel,
        text: "There's no active round right now. Updates are collected Mon–Fri evenings; replies accepted until 10:50 AM next working day.",
      });
      return;
    }

    const participantIds = JSON.parse(round.participant_ids || "[]");
    if (!participantIds.includes(userId)) {
      await client.chat.postMessage({
        channel: message.channel,
        text: "You're not in this round's participant list. If you think this is an error, ask your lead.",
      });
      return;
    }

    const answers = parseReply(message.text);
    const config = loadConfig();
    while (answers.length < config.questions.length) {
      answers.push("");
    }

    const repliedAt = DateTime.now().toISO();
    upsertResponse.run(round.id, userId, JSON.stringify(answers), repliedAt);

    await client.chat.postMessage({
      channel: message.channel,
      text: "Thanks, your update has been recorded.",
    });
  });
}
