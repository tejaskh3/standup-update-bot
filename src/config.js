import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const paths = [
    resolve(process.cwd(), "config.yaml"),
    resolve(__dirname, "..", "config.yaml"),
  ];
  const path = paths.find((p) => existsSync(p));
  if (!path) {
    throw new Error(
      "config.yaml not found. Copy config.example.yaml to config.yaml and fill in your values."
    );
  }
  const raw = yaml.parse(readFileSync(path, "utf8"));
  return {
    devs: raw.devs || [],
    summaryChannel: raw.summaryChannel || "#daily-updates",
    timezone: raw.timezone || "UTC",
    askTime: raw.askTime || "19:00",
    onTimeCutoff: raw.onTimeCutoff || "10:50",
    postTime: raw.postTime || "11:00",
    questions: raw.questions || [
      "What progress did you make last working day?",
      "What progress are you going to make today?",
      "Please mention blockers if you were facing any?",
    ],
  };
}

export { loadConfig };
