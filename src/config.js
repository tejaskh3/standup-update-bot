import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadConfig() {
  const envYaml = process.env.CONFIG_YAML;
  if (envYaml) {
    const raw = yaml.parse(envYaml);
    return normalizeConfig(raw);
  }

  const paths = [
    resolve(process.cwd(), "config.yaml"),
    resolve(__dirname, "..", "config.yaml"),
  ];
  const path = paths.find((p) => existsSync(p));
  if (!path) {
    throw new Error(
      "config.yaml not found. Set CONFIG_YAML env var or copy config.example.yaml to config.yaml."
    );
  }
  const raw = yaml.parse(readFileSync(path, "utf8"));
  return normalizeConfig(raw);
}

function normalizeConfig(raw) {
  return {
    devs: raw.devs || [],
    summaryChannel: raw.summaryChannel || raw.summary_channel || "#daily-updates",
    timezone: raw.timezone || "UTC",
    askTime: raw.askTime || raw.ask_time || "19:00",
    onTimeCutoff: raw.onTimeCutoff || raw.on_time_cutoff || "10:50",
    postTime: raw.postTime || raw.post_time || "11:00",
    questions: raw.questions || [
      "What progress did you make last working day?",
      "What progress are you going to make today?",
      "Please mention blockers if you were facing any?",
    ],
  };
}

export { loadConfig };
