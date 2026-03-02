# GP Bot — Slack Daily Update Bot

Collects daily updates from devs at 7 PM, posts a summary the next working day at 11 AM. Late replies (10:50–11 AM) are marked; after 11 AM goes to "Who missed."

## Quick start

1. **Create Slack app** at [api.slack.com/apps](https://api.slack.com/apps)
   - Enable Socket Mode
   - Add scopes: `chat:write`, `im:write`, `im:read`, `users:read`, `users:read.email`, `channels:read`
   - For private channels: add `groups:read`
   - Install to workspace

2. **Configure**
   ```bash
   cp .env.example .env
   cp config.example.yaml config.yaml
   # Edit .env with SLACK_BOT_TOKEN and SLACK_APP_TOKEN
   # Edit config.yaml with dev emails, summary channel, timezone
   ```

3. **Invite bot** to the summary channel: `/invite @YourBot` in `#daily-updates`

4. **Run**
   ```bash
   npm install
   npm start
   ```

## Schedule

- **7 PM Mon–Fri:** Bot DMs devs with 3 questions
- **10:50 AM:** On-time cutoff (replies before = on-time)
- **11 AM:** Post summary (on-time + late 10:50–11 + who missed)

Friday 7 PM → replies until Monday 10:50 AM → post Monday 11 AM.

## Config

See `config.example.yaml`. Key fields:

- `devs`: list of emails
- `summaryChannel`: e.g. `#daily-updates`
- `timezone`: e.g. `Asia/Kolkata`
- `questions`: 3 questions (editable)

## Full setup

See [SETUP_AND_CONFIGURATION.md](SETUP_AND_CONFIGURATION.md) for detailed steps.
