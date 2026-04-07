/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appPath = "../src/scripts/app.ts";

function mountAppShell() {
  document.body.innerHTML = `
    <main data-main aria-busy="false"></main>
    <p data-date></p>
    <p data-time></p>
    <p data-quote></p>
    <p data-author></p>
    <p data-prompt></p>
    <p data-lang-note></p>
    <button data-prev>Prev</button>
    <button data-next>Next</button>
    <button data-today class="hidden">Today</button>
    <span data-day-indicator></span>
    <div data-error-summary class="hidden"><p></p></div>
    <button data-retry class="hidden">Retry</button>
    <button data-theme="light"></button>
    <button data-theme="dark"></button>
    <button data-theme="system"></button>
    <button data-lang="en"></button>
    <button data-lang="es"></button>
  `;
}

function createResponse(data: unknown, ok = true): Response {
  return new Response(JSON.stringify(data), {
    status: ok ? 200 : 500,
    headers: { "content-type": "application/json" }
  });
}

async function importApp() {
  vi.resetModules();
  await import(appPath);
}

async function flushAsync() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("runtime behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mountAppShell();
    localStorage.clear();
    Object.defineProperty(window.navigator, "language", {
      value: "en-US",
      configurable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("supports retry flow after initial load failure", async () => {
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(createResponse({}, false))
      .mockResolvedValueOnce(
        createResponse({
          "2026-06-15": {
            languages: {
              en: {
                quote: "Run with purpose.",
                prompt: "What is your focus today?",
                author: "Coach"
              }
            }
          }
        })
      );

    const retry = document.querySelector<HTMLButtonElement>("[data-retry]");
    const summary = document.querySelector<HTMLElement>("[data-error-summary]");
    const quote = document.querySelector<HTMLElement>("[data-quote]");

    await importApp();
    await vi.waitFor(() => {
      expect(summary?.classList.contains("hidden")).toBe(false);
    });

    expect(retry?.classList.contains("hidden")).toBe(false);
    expect(summary?.classList.contains("hidden")).toBe(false);
    expect(quote?.textContent).toBe("Unable to load today's spark.");

    retry?.click();
    await vi.waitFor(() => {
      expect(quote?.textContent).toBe("Run with purpose.");
    });

    expect(summary?.classList.contains("hidden")).toBe(true);
    expect(retry?.classList.contains("hidden")).toBe(true);
    expect(quote?.textContent).toBe("Run with purpose.");
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("shows boundary state at start and end of year", async () => {
    vi.setSystemTime(new Date("2026-01-02T10:00:00Z"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createResponse({
        "2026-01-01": { languages: { en: { quote: "A", prompt: "B" } } },
        "2026-01-02": { languages: { en: { quote: "C", prompt: "D" } } },
        "2026-12-30": { languages: { en: { quote: "E", prompt: "F" } } },
        "2026-12-31": { languages: { en: { quote: "G", prompt: "H" } } }
      })
    );

    await importApp();
    await flushAsync();

    const prev = document.querySelector<HTMLButtonElement>("[data-prev]");
    const next = document.querySelector<HTMLButtonElement>("[data-next]");
    const today = document.querySelector<HTMLButtonElement>("[data-today]");
    const indicator = document.querySelector<HTMLElement>("[data-day-indicator]");

    prev?.click();
    await flushAsync();

    expect(prev?.disabled).toBe(true);
    expect(indicator?.textContent).toBe("Start of year");
    expect(today?.classList.contains("hidden")).toBe(false);

    for (let i = 0; i < 364; i += 1) {
      next?.click();
    }
    await flushAsync();

    expect(next?.disabled).toBe(true);
    expect(indicator?.textContent).toBe("End of year");
    expect(today?.classList.contains("hidden")).toBe(false);
  });

  it("supports keyboard navigation on nav controls", async () => {
    vi.setSystemTime(new Date("2026-06-15T10:00:00Z"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      createResponse({
        "2026-06-14": { languages: { en: { quote: "Q14", prompt: "P14" } } },
        "2026-06-15": { languages: { en: { quote: "Q15", prompt: "P15" } } },
        "2026-06-16": { languages: { en: { quote: "Q16", prompt: "P16" } } }
      })
    );

    await importApp();
    await flushAsync();

    const prev = document.querySelector<HTMLButtonElement>("[data-prev]");
    const next = document.querySelector<HTMLButtonElement>("[data-next]");
    const date = document.querySelector<HTMLElement>("[data-date]");

    next?.focus();
    next?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    await flushAsync();

    expect(prev).toBe(document.activeElement);
    expect(date?.textContent).toContain("14");

    prev?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await flushAsync();

    expect(next).toBe(document.activeElement);
    expect(date?.textContent).toContain("15");
  });
});
