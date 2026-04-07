# System Design — Daily Sports Inspirational Quotes Web App

## Summary
A mobile-first web app that presents a daily sports-related inspirational quote and a longer reflective prompt in a desk-calendar layout. The app opens on the current date, supports navigation across the current year only (including leap years), and offers light/dark/system theming and language selection. Content is sourced from a local static JSON file with per-day, per-language entries. The current scaffold uses Astro + TypeScript + Tailwind and is managed with Bun.

## Current Implementation Snapshot
- **Framework**: Astro (static + client-side hydration)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + global theme tokens
- **Package Manager**: Bun (`bun@1.3.8`)
- **Testing**: Vitest (data contract + date validation)
- **Linting**: ESLint (flat config with Astro + TypeScript)

## Goals
- Inspire daily engagement through concise quotes and longer prompts.
- Feel like a desk calendar: date-forward, easy next/prev navigation.
- Be fast, offline-friendly, and accessible on mobile.

## Non-Goals
- Multi-year browsing or historical archives.
- User accounts or cloud sync.
- Server-side personalization or recommendations (v1).

## Primary User Flow
1. User opens app.
2. App detects current date and locale; loads today’s content in chosen language.
3. User optionally switches theme/language or browses to previous/next day within current year.

## Information Architecture
- **Header / Utility Bar**
  - App name + tagline.
  - Theme toggle: Light / Dark / System.
  - Language switch: EN, ES, EU, FR, DE, PT-BR.
- **Main Content (two panels)**
  - **Left Panel (Date + Quote)**
    - Localized date and time (user’s locale/timezone).
    - “Today’s Spark” label.
    - Quote text + author.
    - Prev/Next day navigation buttons.
    - “Today” chip appears only when browsing away from current day.
  - **Right Panel (Prompt)**
    - “Thoughtful Prompt” label.
    - Long-form reflective prompt.
    - Inline fallback note when language is missing (shows EN).

## Layout & Responsiveness
- **Mobile (primary)**: panels stacked vertically.
- **Tablet/Desktop**: panels side-by-side with a clear central gutter.
- Minimum tap targets: 44px.
- Use bold typographic hierarchy to emphasize date and quote.

## Theme System
- **Modes**: Light, Dark, System.
- **Persistence**: localStorage.
- **System Mode**: follows `prefers-color-scheme`.
- Theme applies to background, text, panel surfaces, and accent elements.

## Language System
- **Supported**: EN, ES, EU (Euskera), FR, DE, PT-BR (Brazilian Portuguese).
- **Persistence**: localStorage.
- **Fallback**: If content missing for selected language, fallback to EN and show a subtle inline note.

## Date & Year Logic
- On launch, set the active date to the device’s current local date.
- Date navigation clamps between `Jan 1` and `Dec 31` of the current year.
- Leap years: include Feb 29 when present.
- “Today” indicator appears when browsing away from current date.

## Data Model & JSON Contract
**Source**: local static JSON bundled with the app at `public/data/2026.json`.

### Top-Level Structure
- A map keyed by ISO date (`YYYY-MM-DD`), each value contains localized content.

### Example Schema (conceptual)
```json
{
  "2026-04-07": {
    "languages": {
      "en": {
        "quote": "Discipline is the bridge between training and triumph.",
        "author": "Coach Rivera",
        "prompt": "Think about one moment this season when you chose effort over ease..."
      },
      "es": { "quote": "...", "author": "...", "prompt": "..." },
      "eu": { "quote": "...", "author": "...", "prompt": "..." },
      "fr": { "quote": "...", "author": "...", "prompt": "..." },
      "de": { "quote": "...", "author": "...", "prompt": "..." },
      "pt-BR": { "quote": "...", "author": "...", "prompt": "..." }
    }
  }
}
```

### Required Fields
- `quote` (string)
- `prompt` (string)

### Optional Fields
- `author` (string)
- `tags` (string[])

### Validation Rules
- Date keys must be valid ISO dates and within the current year.
- Each day must have at least one language (EN preferred).
- If the active language is missing, fallback to EN.

## Error States
- **Missing date entry**: show a friendly “No content for this day” state + disable forward/back if at boundary.
- **Missing language entry**: fallback to EN with inline note.
- **JSON parse failure**: show a recovery screen with “Retry” and error summary.

## Accessibility
- Contrast ratios meet WCAG AA.
- Respect `prefers-reduced-motion`.
- All toggles are keyboard accessible and labeled with ARIA.

## Performance
- JSON loaded once on app start and cached in memory.
- Time updates: tick per minute (not per second) to reduce unnecessary re-rendering.

## Testing Scenarios
- JSON contract validation (quote/prompt required).
- Date format and leap-year validation.
- Locale formatting in EN, FR, and DE.
- Boundary navigation: Jan 1 and Dec 31 clamps.
- Theme persistence across reload.
- Language fallback to EN when localized entry is missing.

## Acceptance Criteria
- App opens to today’s date in user locale/timezone.
- Quote + prompt render for selected language.
- Theme and language preferences persist.
- Navigation works within current year only.
- Layout is clean and usable on mobile, tablet, and desktop.
