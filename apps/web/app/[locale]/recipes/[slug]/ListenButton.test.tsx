import { act, fireEvent, render, screen } from "@testing-library/react";

import type { FunnelEvent } from "@sorrel/analytics";

import { ListenButton } from "./ListenButton";

// Spec 053 — component state tests. fetch, Audio and the tracker are mocked;
// nothing here reaches /api/tts, let alone ElevenLabs.

const events: FunnelEvent[] = [];
jest.mock("../../wizard/analytics", () => ({
  createAppTracker: () => (event: FunnelEvent) => events.push(event),
}));

jest.mock("next-intl", () => ({
  useTranslations: (ns: string) => (key: string) => `${ns}.${key}`,
}));

jest.mock("@sorrel/ui", () => ({
  AppButton: ({
    children,
    startIcon,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { startIcon?: React.ReactNode }) => (
    <button {...props}>
      {startIcon}
      {children}
    </button>
  ),
}));

class FakeAudio {
  static last: FakeAudio;
  static rejectPlay = false;
  currentTime = 0;
  play = jest.fn(() =>
    FakeAudio.rejectPlay ? Promise.reject(new Error("NotAllowedError")) : Promise.resolve(),
  );
  pause = jest.fn();
  private listeners: Record<string, () => void> = {};
  constructor(public src: string) {
    FakeAudio.last = this;
  }
  addEventListener(type: string, fn: () => void) {
    this.listeners[type] = fn;
  }
  emit(type: string) {
    this.listeners[type]?.();
  }
}

const fetchMock = jest.fn();

beforeEach(() => {
  events.length = 0;
  FakeAudio.rejectPlay = false;
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  (global as unknown as { Audio: unknown }).Audio = FakeAudio;
  URL.createObjectURL = jest.fn(() => "blob:tts");
  URL.revokeObjectURL = jest.fn();
});

function okAudio() {
  fetchMock.mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(["mp3"])) });
}

const button = () => screen.getByTestId("listen-button");
const statusText = () => screen.getByRole("status").textContent;
const activeLabel = () => button().querySelector('[data-active="true"]')?.textContent;

async function click() {
  await act(async () => {
    fireEvent.click(button());
  });
}

describe("ListenButton", () => {
  it("renders every label in the width-reserving stack, one active (spec 055)", () => {
    render(<ListenButton text="Wild salmon." contentId="salmon" />);
    const labels = button().querySelectorAll(".sorrel-listen__labels > span");
    expect(labels).toHaveLength(5);
    expect(button().querySelectorAll('[data-active="true"]')).toHaveLength(1);
    expect(button().querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("starts idle with the Listen label", () => {
    render(<ListenButton text="Wild salmon." contentId="salmon" />);
    expect(button().getAttribute("aria-label")).toBe("Recipes.listen.action.idle");
    expect(activeLabel()).toBe("Recipes.listen.action.idle");
    expect(statusText()).toBe("");
  });

  it("shows loading while the request is in flight", async () => {
    let resolve: (value: unknown) => void = () => {};
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<ListenButton text="Wild salmon." contentId="salmon" />);
    await click();
    expect(button().dataset.status).toBe("loading");
    expect(button().getAttribute("aria-busy")).toBe("true");
    expect(statusText()).toBe("Recipes.listen.status.loading");
    await act(async () => resolve({ ok: true, blob: () => Promise.resolve(new Blob(["mp3"])) }));
    expect(button().dataset.status).toBe("playing");
  });

  it("plays, pauses, resumes and ends, firing the typed events", async () => {
    okAudio();
    render(<ListenButton text="Wild salmon." contentId="salmon" />);

    await click();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/tts",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ text: "Wild salmon." }) }),
    );
    expect(button().dataset.status).toBe("playing");
    expect(statusText()).toBe("Recipes.listen.status.playing");

    FakeAudio.last.currentTime = 1.23;
    await click();
    expect(button().dataset.status).toBe("paused");
    expect(statusText()).toBe("Recipes.listen.status.paused");
    expect(activeLabel()).toBe("Recipes.listen.action.paused");
    expect(button().getAttribute("aria-label")).toBe("Recipes.listen.action.paused");

    await click();
    expect(button().dataset.status).toBe("playing");

    await act(async () => FakeAudio.last.emit("ended"));
    expect(button().dataset.status).toBe("idle");
    expect(statusText()).toBe("Recipes.listen.status.ended");
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:tts");

    expect(events).toEqual([
      { name: "tts_play", content_id: "salmon", chars: 12 },
      { name: "tts_pause", content_id: "salmon", position_s: 1.2 },
      { name: "tts_play", content_id: "salmon", chars: 12 },
      { name: "tts_ended", content_id: "salmon" },
    ]);
  });

  it("goes to error with the server code on a 429", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "rate_limited" }),
    });
    render(<ListenButton text="Wild salmon." contentId="salmon" />);
    await click();
    expect(button().dataset.status).toBe("error");
    expect(button().getAttribute("aria-label")).toBe("Recipes.listen.action.error");
    expect(statusText()).toBe("Recipes.listen.status.error");
    expect(events).toEqual([{ name: "tts_error", content_id: "salmon", error: "rate_limited" }]);
  });

  it("reports network and playback failures", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    render(<ListenButton text="Wild salmon." contentId="salmon" />);
    await click();
    expect(events.at(-1)).toEqual({ name: "tts_error", content_id: "salmon", error: "network" });

    expect(button().dataset.status).toBe("error");

    // Retry from error re-fetches; a rejected play() (autoplay policy) lands back in error.
    okAudio();
    FakeAudio.rejectPlay = true;
    await click();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(button().dataset.status).toBe("error");
    expect(events.at(-1)).toEqual({
      name: "tts_error",
      content_id: "salmon",
      error: "playback_failed",
    });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:tts");
  });

  it("truncates text over the cap before sending", async () => {
    okAudio();
    render(<ListenButton text={`${"word ".repeat(300)}`} contentId="salmon" />);
    await click();
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string) as { text: string };
    expect(sent.text.length).toBeLessThanOrEqual(1000);
    expect(sent.text.endsWith("word")).toBe(true);
  });
});
