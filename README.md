# Tāla Lab

[![Release](https://img.shields.io/github/v/release/CGS26/thalam-studio?display_name=tag&sort=semver)](https://github.com/CGS26/thalam-studio/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-171717.svg)](LICENSE)
[![PWA](https://img.shields.io/badge/PWA-installable-171717.svg)](#install-the-pwa)
[![Next.js](https://img.shields.io/badge/Next.js-16-171717.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-171717.svg)](https://www.typescriptlang.org/)
[![Local processing](https://img.shields.io/badge/data-local%20processing-171717.svg)](#privacy)

Tāla Lab is a database-free Carnatic tāḷa and sub-beat composer, built with
Next.js, Web Audio, Tone.js, and Tailwind CSS.

The production app is hosted on Vercel and can be installed as a Progressive
Web App (PWA) on phones and desktop computers.

[Source code](https://github.com/CGS26/thalam-studio) ·
[Report a bug](https://github.com/CGS26/thalam-studio/issues/new/choose) ·
[Latest release](https://github.com/CGS26/thalam-studio/releases/tag/v1.0.0) ·
[All tags](https://github.com/CGS26/thalam-studio/tags) ·
[Roadmap](ROADMAP.md)

## Latest Release — v1.0.0

The first stable release includes:

- Custom tāḷa cycles with editable aṅgas and per-aṅga aksharas
- Per-akshara nadai, mātra accent patterns, and click sounds
- Local audio import with waveform trimming and processing controls
- Full-cycle browser playback with live akshara and sub-beat tracking
- WAV rendering and portable JSON import/export
- Installable, responsive PWA with offline caching
- Local-first operation with no account or project database
- Premium monochrome interface for phone, tablet, and desktop

Read the complete [v1.0.0 release notes](CHANGELOG.md#100---2026-07-28),
browse [all releases](https://github.com/CGS26/thalam-studio/releases), or view
the [`v1.0.0` tag](https://github.com/CGS26/thalam-studio/tree/v1.0.0).

## Features

- Create custom tāḷa cycles and aṅga groupings
- Add and remove aksharas within individual aṅgas
- Choose gati/nadai subdivisions for every akshara
- Design mātra accents and click sounds
- Import local WAV, MP3, M4A, Opus, Ogg, and compatible WebM audio
- Trim waveforms and adjust gain, tempo, pitch, pan, fades, EQ, and compression
- Preview complete cycles in the browser
- Export rendered audio as WAV
- Export and import arrangements as JSON
- Install the app and reopen previously visited content offline

Audio files and compositions are processed locally in the browser. The app
does not require a database or user account.

## Install the PWA

The deployed Vercel site must be opened once while online before offline access
is available.

### Android

1. Open the production site in Chrome.
2. Tap the three-dot menu.
3. Select **Install app** or **Add to Home screen**.
4. Confirm the installation.

### iPhone or iPad

1. Open the production site in Safari.
2. Tap the **Share** button.
3. Select **Add to Home Screen**.
4. Tap **Add**.

### Desktop

Open the production site in Chrome or Edge and select the install icon in the
address bar.

## Local Development

### Prerequisites

- Node.js `>=22.13.0`

### Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

The service worker is registered only in production to prevent stale assets
from interfering with development.

## Validation

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Use the detected **Next.js** framework preset.
3. Keep the standard install and build commands.
4. Deploy the project.

The project uses a static Next.js export, configured in `next.config.ts`.

For a normal Vercel domain such as `https://project-name.vercel.app/`, do not
define `NEXT_PUBLIC_BASE_PATH`. It should remain empty.

Only set it when the app is intentionally served from a URL subpath:

```text
NEXT_PUBLIC_BASE_PATH=/thalam
```

Do not include a domain, quotes, or a trailing slash. Redeploy after changing
the environment variable.

## PWA Structure

- `public/manifest.webmanifest` contains the app name, colors, icons, and
  standalone display settings.
- `public/sw.js` caches the app shell and previously visited same-origin assets.
- `app/ServiceWorkerRegistration.tsx` registers the service worker in
  production.
- `public/icon-192.png`, `public/icon-512.png`, and
  `public/apple-touch-icon.png` provide install icons.

PWA installation requires HTTPS. Vercel provides HTTPS automatically.

## Project Structure

- `app/page.tsx` — composer interface and browser audio engine
- `app/WaveformEditor.tsx` — interactive waveform editor
- `app/globals.css` — responsive premium monochrome design system
- `app/layout.tsx` — metadata and PWA integration
- `native/thalam_engine.cpp` — native timing-engine foundation
- `public/` — icons, manifest, service worker, and static assets

## Privacy

Tāla Lab has no accounts or project database. Compositions and imported audio
are processed locally in the browser and are not intentionally uploaded.
The service worker stores app resources on the user's device for offline use.

The hosted site can still produce ordinary Vercel request logs, and the current
Google Fonts integration makes an external font request. See the in-app
**Privacy** page for details.

## Open Source

Tāla Lab is available under the [MIT License](LICENSE).
The current stable release is **v1.0.0**; release history is documented in
[CHANGELOG.md](CHANGELOG.md).

Future features are tracked in the community [roadmap](ROADMAP.md). Anyone can
fork the project and contribute. Check or open a GitHub issue before starting a
larger feature so contributors can agree on behavior and avoid duplicated work.

- Read [CONTRIBUTING.md](CONTRIBUTING.md) before submitting changes.
- Community expectations are in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
- Report vulnerabilities according to [SECURITY.md](SECURITY.md).
- Dependency acknowledgements are in
  [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Useful Commands

- `npm run dev` — start local development
- `npm run lint` — run ESLint
- `npm run build` — create the production static export

## Learn More

- [Next.js documentation](https://nextjs.org/docs)
- [Vercel documentation](https://vercel.com/docs)
