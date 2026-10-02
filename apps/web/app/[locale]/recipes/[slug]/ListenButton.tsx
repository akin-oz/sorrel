"use client";

import { useEffect, useRef, useState } from "react";

import { useTranslations } from "next-intl";

import type { FunnelEvent, Track, TtsErrorCode } from "@sorrel/analytics";
import { AppButton } from "@sorrel/ui";

import { isTtsError, truncateForTts } from "../../../../lib/tts";
import { createAppTracker } from "../../wizard/analytics";
import { LISTEN_STYLES, ListenIcon, type ListenStatus } from "./ListenIcon";

/**
 * Spec 053 — "Listen" read-aloud button for the recipe description.
 *
 * Fetches the whole mp3 from `/api/tts` as a blob, then plays it through an
 * `Audio` element. Blob-then-play over MediaSource streaming: ≤1,000 chars is a
 * few seconds of audio, and blob playback works in every browser incl. Safari.
 */
const STATUSES: readonly ListenStatus[] = ["idle", "loading", "playing", "paused", "error"];

interface Player {
  audio: HTMLAudioElement;
  url: string;
}

let tracker: Track | undefined;
function track(event: FunnelEvent) {
  tracker ??= createAppTracker();
  tracker(event);
}

function releasePlayer(player: Player | null) {
  if (!player) return;
  player.audio.pause();
  URL.revokeObjectURL(player.url);
}

export function ListenButton({ text, contentId }: { text: string; contentId: string }) {
  const t = useTranslations("Recipes.listen");
  const [status, setStatus] = useState<ListenStatus>("idle");
  const [announcement, setAnnouncement] = useState("");
  const playerRef = useRef<Player | null>(null);
  const spoken = truncateForTts(text);

  useEffect(() => {
    const ref = playerRef;
    return () => releasePlayer(ref.current);
  }, []);

  function release() {
    releasePlayer(playerRef.current);
    playerRef.current = null;
  }

  function fail(error: TtsErrorCode) {
    release();
    setStatus("error");
    setAnnouncement(t("status.error"));
    track({ name: "tts_error", content_id: contentId, error });
  }

  async function play(audio: HTMLAudioElement) {
    try {
      await audio.play();
    } catch {
      fail("playback_failed");
      return;
    }
    setStatus("playing");
    setAnnouncement(t("status.playing"));
    track({ name: "tts_play", content_id: contentId, chars: spoken.length });
  }

  function pause(audio: HTMLAudioElement) {
    audio.pause();
    setStatus("paused");
    setAnnouncement(t("status.paused"));
    track({
      name: "tts_pause",
      content_id: contentId,
      position_s: Math.round(audio.currentTime * 10) / 10,
    });
  }

  async function start() {
    setStatus("loading");
    setAnnouncement(t("status.loading"));
    let blob: Blob;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: spoken }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
        fail(isTtsError(body?.error) ? body.error : "upstream_error");
        return;
      }
      blob = await res.blob();
    } catch {
      fail("network");
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener("ended", () => {
      release();
      setStatus("idle");
      setAnnouncement(t("status.ended"));
      track({ name: "tts_ended", content_id: contentId });
    });
    playerRef.current = { audio, url };
    await play(audio);
  }

  function handleClick() {
    const player = playerRef.current;
    if (status === "playing" && player) pause(player.audio);
    else if (status === "paused" && player) void play(player.audio);
    else if (status === "idle" || status === "error") void start();
    // loading: ignore repeat clicks (aria-busy tells AT why)
  }

  const label = t(`action.${status}`);

  return (
    <>
      <style href="sorrel-listen" precedence="default">
        {LISTEN_STYLES}
      </style>
      <AppButton
        className="sorrel-listen"
        variant="contained"
        size="large"
        startIcon={<ListenIcon status={status} />}
        onClick={handleClick}
        aria-label={label}
        aria-busy={status === "loading"}
        data-testid="listen-button"
        data-status={status}
      >
        {/* Every label sits in one grid cell, so the button keeps the widest
            label's width and never shifts as the state changes (spec 055). */}
        <span className="sorrel-listen__labels">
          {STATUSES.map((s) => (
            <span key={s} data-active={s === status} aria-hidden="true">
              {t(`action.${s}`)}
            </span>
          ))}
        </span>
      </AppButton>
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
        }}
      >
        {announcement}
      </span>
    </>
  );
}
