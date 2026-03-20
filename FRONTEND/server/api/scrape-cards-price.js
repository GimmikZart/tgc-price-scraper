import { spawn } from "node:child_process";
import path from "node:path";
import { createError, defineEventHandler, setResponseStatus } from "h3";
import { broadcastEvent } from "./scrape-stream";

let activeScrape = null;

function broadcastProcessLine(type, line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return;

  const lower = trimmed.toLowerCase();
  const eventType = lower.includes("[error]")
    ? "generic_error"
    : lower.includes("[warn]")
      ? "generic_warning"
      : lower.includes("[done]") || lower.includes("[ok]") || lower.includes("[save]")
        ? "generic_success"
        : "generic_info";

  broadcastEvent(eventType, trimmed);
  broadcastEvent(type, trimmed);
}

function forwardProcessOutput(stream, type) {
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";
    lines.forEach((line) => broadcastProcessLine(type, line));
  });

  stream.on("end", () => {
    if (buffer.trim()) {
      broadcastProcessLine(type, buffer);
      buffer = "";
    }
  });
}

function runPriceScrapeProcess() {
  if (activeScrape) return activeScrape;

  const scriptPath = path.resolve(process.cwd(), "scripts", "run-scrape-cards-price.js");
  const child = spawn(process.execPath, [scriptPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  broadcastEvent("generic_info", "Avvio scraping prezzi con il flusso nuovo");

  forwardProcessOutput(child.stdout, "scrape:stdout");
  forwardProcessOutput(child.stderr, "scrape:stderr");

  activeScrape = new Promise((resolve, reject) => {
    child.once("error", (error) => {
      broadcastEvent("generic_error", `Errore avvio scraper: ${error.message}`);
      activeScrape = null;
      reject(error);
    });

    child.once("close", (code) => {
      activeScrape = null;
      if (code === 0) {
        broadcastEvent("scrape:done", { exitCode: code });
        resolve();
        return;
      }

      const error = new Error(`Lo scraper prezzi e terminato con codice ${code}`);
      broadcastEvent("scrape:error", { exitCode: code, message: error.message });
      reject(error);
    });
  });

  return activeScrape;
}

export default defineEventHandler(async (event) => {
  if (activeScrape) {
    throw createError({
      statusCode: 409,
      statusMessage: "Uno scraping prezzi e gia in esecuzione.",
    });
  }

  try {
    await runPriceScrapeProcess();
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || "Errore durante lo scraping prezzi.",
    });
  }

  setResponseStatus(event, 204);
  return null;
});
