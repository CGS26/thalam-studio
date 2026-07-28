# Tāla Lab Roadmap

Tāla Lab is open source, and community contributions are welcome. The roadmap
is directional rather than a promise or fixed release schedule.

Before starting a feature:

1. Check the existing [GitHub issues](https://github.com/CGS26/thalam-studio/issues).
2. Open or comment on an issue describing the intended behavior.
3. Wait for agreement on larger architectural or musical-model changes.
4. Fork the repository and create a focused feature branch.
5. Follow [CONTRIBUTING.md](CONTRIBUTING.md) and submit a pull request.

This coordination step helps prevent duplicated or incompatible implementations.

## Editing and Reliability

- [ ] Undo and redo for composition and audio-editing actions
- [ ] Optional local project recovery using browser storage
- [ ] Akshara copy, paste, and duplication
- [ ] Aṅga duplication, deletion, collapse, and reordering
- [ ] Drag-and-drop aksharas within and between aṅgas
- [ ] Expanded keyboard shortcuts

Local recovery must remain device-only, require no account, and explain clearly
how users can remove saved browser data.

## Rhythm and Practice

- [ ] Tap tempo
- [ ] Configurable count-in
- [ ] Kalai control with clear counts-per-akshara terminology
- [ ] Eduppu support in aksharas and mātras
- [ ] Visual hand gestures for laghu, dhrutam, and anudhrutam
- [ ] Solkattu and konnakol text editor
- [ ] Korvai, mora, and theermanam builders
- [ ] Multi-speed and gradually increasing-tempo practice
- [ ] Random beat muting for internal-laya practice
- [ ] Cycle targets, session timer, and local practice statistics

Changes to Carnatic terminology or timing behavior should include an explanation,
worked examples, and references where appropriate.

## Audio

- [ ] Microphone recording initiated explicitly by the user
- [ ] Drag-and-drop audio import
- [ ] Audio preview before assignment
- [ ] Automatic silence detection
- [ ] Per-akshara mute and solo
- [ ] Master volume and limiter
- [ ] Crossfades between aksharas
- [ ] Multiple audio layers per akshara
- [ ] Export selected aṅgas or cycle ranges
- [ ] Stem, click-only, and MIDI export

Imported and recorded audio should remain local unless a future feature clearly
states otherwise and receives explicit user consent.

## PWA and Sharing

- [ ] In-app PWA install prompt
- [ ] Offline and update-available indicators
- [ ] Install update flow without losing current work
- [ ] Openable `.thalam` project-file format
- [ ] Native share-sheet integration where supported
- [ ] Compact URL or QR sharing for projects without embedded audio
- [ ] Printable notation and PDF export
- [ ] Wake Lock during practice
- [ ] Improved background-audio behavior where browsers permit it

## Accessibility and Internationalization

- [ ] Dark and high-contrast themes
- [ ] Larger performance-mode controls
- [ ] Screen-reader playback announcements
- [ ] Complete keyboard navigation audit
- [ ] Reduced-motion review
- [ ] Tamil, Telugu, Kannada, Malayalam, and Hindi translations
- [ ] Translation contribution workflow

## Suggested GitHub Labels

Maintainers can use:

- `roadmap` — planned work
- `help wanted` — community contributions are welcome
- `good first issue` — small, well-scoped introductions to the project
- `audio` — browser audio engine and export
- `carnatic-rhythm` — musical model and terminology
- `pwa` — installation, offline use, and updates
- `accessibility` — inclusive interaction improvements
- `documentation` — guides, examples, and reference material

## Proposing Something Else

New ideas are welcome even when they are not listed here. Open a feature request
and explain:

- The user problem
- The proposed behavior
- How it fits Tāla Lab's local-first, database-free direction
- Any privacy, accessibility, or compatibility implications

See the [feature request form](https://github.com/CGS26/thalam-studio/issues/new/choose).
