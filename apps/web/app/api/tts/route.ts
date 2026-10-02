import { NextResponse } from "next/server";

import {
  TTS_ERROR_STATUS,
  type TtsError,
  createRateLimiter,
  validateTtsRequest,
} from "../../../lib/tts";

/**
 * Spec 053 — POST /api/tts
 *
 * Proxies `{ text }` to ElevenLabs' streaming TTS endpoint and streams the mp3
 * back. `ELEVENLABS_API_KEY` / `ELEVENLABS_VOICE_ID` are server-only — never
 * `NEXT_PUBLIC_*` — so the key never reaches the browser.
 *
 * Plain `fetch`, not `@elevenlabs/elevenlabs-js`: it is one POST, and `fetch`
 * already hands us a `ReadableStream` to pipe straight into the response.
 */
export const runtime = "nodejs";

const ELEVENLABS_URL = "https://api.elevenlabs.io/v1/text-to-speech";
/** Lowest-latency current model (~75 ms), multilingual for en + de. */
const MODEL_ID = "eleven_flash_v2_5";
const OUTPUT_FORMAT = "mp3_44100_128";

const limiter = createRateLimiter({ limit: 5, windowMs: 60_000 });

function fail(error: TtsError) {
  return NextResponse.json({ error }, { status: TTS_ERROR_STATUS[error] });
}

function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId) return fail("not_configured");

  if (!limiter.check(clientIp(request))) return fail("rate_limited");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("invalid_json");
  }
  const parsed = validateTtsRequest(body);
  if (!parsed.ok) return fail(parsed.error);

  let upstream: Response;
  try {
    upstream = await fetch(
      `${ELEVENLABS_URL}/${encodeURIComponent(voiceId)}/stream?output_format=${OUTPUT_FORMAT}`,
      {
        method: "POST",
        headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ text: parsed.text, model_id: MODEL_ID }),
      },
    );
  } catch {
    return fail("upstream_error");
  }
  // The vendor error body is not forwarded — it can echo account detail.
  if (!upstream.ok || !upstream.body) return fail("upstream_error");

  return new Response(upstream.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}
