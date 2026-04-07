import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("daily quote data", () => {
  const dataPath = join(process.cwd(), "public", "data", `${new Date().getFullYear()}.json`);
  const raw = readFileSync(dataPath, "utf-8");
  const data = JSON.parse(raw) as Record<string, { languages?: Record<string, unknown> }>;

  it("follows the JSON contract", () => {
    const entries = Object.entries(data);
    expect(entries.length).toBeGreaterThan(0);

    for (const [dateKey, entry] of entries) {
      expect(dateKey).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry).toBeTruthy();
      expect(entry.languages).toBeTruthy();

      const languages = entry.languages as Record<string, { quote?: string; prompt?: string }>;
      const languageKeys = Object.keys(languages);
      expect(languageKeys.length).toBeGreaterThan(0);

      for (const lang of languageKeys) {
        const content = languages[lang];
        expect(typeof content.quote).toBe("string");
        expect(typeof content.prompt).toBe("string");
      }
    }
  });

  it("keeps dates within the current year and respects leap days", () => {
    const entries = Object.keys(data);
    expect(entries.length).toBeGreaterThan(0);

    const years = new Set(entries.map((key) => key.slice(0, 4)));
    expect(years.size).toBe(1);
    const year = Number([...years][0]);

    const isLeap = new Date(year, 1, 29).getMonth() === 1;

    for (const dateKey of entries) {
      const [y, m, d] = dateKey.split("-").map(Number);
      expect(y).toBe(year);
      const date = new Date(y, m - 1, d);
      expect(date.getFullYear()).toBe(y);
      expect(date.getMonth()).toBe(m - 1);
      expect(date.getDate()).toBe(d);
      if (m === 2 && d === 29) {
        expect(isLeap).toBe(true);
      }
    }
  });
});
