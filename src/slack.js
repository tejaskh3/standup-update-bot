import pkg from "@slack/bolt";
const { App } = pkg;

export function createSlackApp() {
  const token = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN is required. Set it in .env");
  }

  // Socket Mode recommended (no public URL needed)
  if (!appToken) {
    throw new Error(
      "SLACK_APP_TOKEN is required for Socket Mode. Enable Socket Mode in Slack app settings and add the app-level token to .env"
    );
  }

  return new App({
    token,
    appToken,
    socketMode: true,
    signingSecret: process.env.SLACK_SIGNING_SECRET || "ignored-for-socket-mode",
  });
}
