# Tāla Lab Roadmap

Tāla Lab is open source, and community contributions are welcome. This roadmap
is directional rather than a promise or fixed release schedule.

A checked item means the feature has been merged into the default branch—not
merely that an issue or pull request exists.

## Priorities

- **P0 — Reliability:** correctness, data-loss prevention, and release safety
- **P1 — Next release:** important user-facing work planned for the next minor release
- **P2 — Future:** valuable work that follows the immediate reliability milestone

## v1.1.0 — Reliability and PWA Polish

- [ ] **P0** [Automated rhythm timing and aṅga mutation tests](https://github.com/CGS26/thalam-studio/issues/8)
- [ ] **P0** [Undo and redo](https://github.com/CGS26/thalam-studio/issues/2)
- [ ] **P0** [Optional local project recovery](https://github.com/CGS26/thalam-studio/issues/3)
- [ ] **P0** [PWA update notification and safe reload](https://github.com/CGS26/thalam-studio/issues/4)
- [ ] **P1** [Tap tempo](https://github.com/CGS26/thalam-studio/issues/1)
- [ ] **P1** [In-app PWA install prompt](https://github.com/CGS26/thalam-studio/issues/5)
- [ ] **P1** [Configurable count-in](https://github.com/CGS26/thalam-studio/issues/6)

Local recovery must remain device-only, require no account, and explain clearly
how users can remove saved browser data. PWA updates must not discard current
work.

## v1.2.0 — Carnatic Rhythm Model

- [ ] **P1** [1, 2, and 4 kalai control](https://github.com/CGS26/thalam-studio/issues/7)
- [ ] **P1** Eduppu support in aksharas and mātras
- [ ] **P1** Visual hand gestures for laghu, dhrutam, and anudhrutam
- [ ] **P2** Multi-speed and gradually increasing-tempo practice
- [ ] **P2** Random beat muting for internal-laya practice

Changes to Carnatic terminology or timing behavior should include an
explanation, worked examples, references where appropriate, backward-compatible
project import, and timing tests.

## Future

### Editing

- [ ] **P2** Akshara copy, paste, and duplication
- [ ] **P2** Aṅga duplication, deletion, collapse, and reordering
- [ ] **P2** Drag-and-drop aksharas within and between aṅgas
- [ ] **P2** Expanded keyboard shortcuts

### Practice

- [ ] **P2** Solkattu and konnakol text editor
- [ ] **P2** Korvai, mora, and theermanam builders
- [ ] **P2** Cycle targets, session timer, and local practice statistics

### Audio

- [ ] **P2** Microphone recording initiated explicitly by the user
- [ ] **P2** Drag-and-drop audio import
- [ ] **P2** Audio preview before assignment
- [ ] **P2** Automatic silence detection
- [ ] **P2** Per-akshara mute and solo
- [ ] **P2** Master volume and limiter
- [ ] **P2** Crossfades between aksharas
- [ ] **P2** Multiple audio layers per akshara
- [ ] **P2** Export selected aṅgas or cycle ranges
- [ ] **P2** Stem, click-only, and MIDI export

Imported and recorded audio should remain local unless a future feature clearly
states otherwise and receives explicit user consent.

### PWA and Sharing

- [ ] **P2** Offline status indicator
- [ ] **P2** Openable `.thalam` project-file format
- [ ] **P2** Native share-sheet integration where supported
- [ ] **P2** Compact URL or QR sharing for projects without embedded audio
- [ ] **P2** Printable notation and PDF export
- [ ] **P2** Wake Lock during practice
- [ ] **P2** Improved background-audio behavior where browsers permit it

The update notification and safe activation flow are tracked together in
[issue #4](https://github.com/CGS26/thalam-studio/issues/4), avoiding duplicate
roadmap entries.

### Accessibility and Internationalization

- [ ] **P2** Dark and high-contrast themes
- [ ] **P2** Larger performance-mode controls
- [ ] **P2** Screen-reader playback announcements
- [ ] **P2** Complete keyboard navigation audit
- [ ] **P2** Reduced-motion review
- [ ] **P2** Tamil, Telugu, Kannada, Malayalam, and Hindi translations
- [ ] **P2** Translation contribution workflow

## Contributing

Before starting a feature:

1. Check the existing [GitHub issues](https://github.com/CGS26/thalam-studio/issues).
2. Open or comment on an issue describing the intended behavior.
3. Wait for agreement on larger architectural or musical-model changes.
4. Fork the repository and create a focused feature branch.
5. Follow [CONTRIBUTING.md](CONTRIBUTING.md) and submit a pull request.

This coordination step helps prevent duplicated or incompatible implementations.

## GitHub Labels

- `priority: P0` — reliability, correctness, or release safety
- `priority: P1` — planned for the next minor release
- `priority: P2` — future enhancement
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
