#!/usr/bin/env node
import fs from "node:fs";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const targetPath = process.argv[2];
if (!targetPath) {
  fail("Usage: patch-openclaw-json-for-linux.mjs /path/to/openclaw.json");
}

const raw = fs.readFileSync(targetPath, "utf8");
let cfg;
try {
  cfg = JSON.parse(raw);
} catch (err) {
  fail(`Failed to parse JSON: ${String(err)}`);
}

cfg.browser ??= {};
cfg.browser.enabled = true;
cfg.browser.headless = true;
cfg.browser.attachOnly = true;
cfg.browser.profiles ??= {};

cfg.browser.profiles.linux ??= {};
cfg.browser.profiles.linux.cdpUrl = "http://127.0.0.1:9222";
cfg.browser.profiles.linux.color ??= "#00AA00";

cfg.browser.defaultProfile = "linux";

// Normalize common Docker-on-Windows paths to the Linux service layout used by this repo.
if (cfg.workspace === "/home/node/.openclaw/workspace") {
  cfg.workspace = "/var/lib/openclaw/workspace";
}

const transcription = cfg.audio?.transcription;
if (transcription?.command && Array.isArray(transcription.command)) {
  transcription.command = transcription.command.map((part) => {
    if (part === "/home/node/.openclaw/workspace/scripts/google-transcribe.mjs") {
      return "/var/lib/openclaw/workspace/scripts/google-transcribe.mjs";
    }
    return part;
  });
}

fs.writeFileSync(targetPath, JSON.stringify(cfg, null, 2) + "\n", "utf8");
process.stdout.write(`Patched browser profile for Linux in: ${targetPath}\n`);
