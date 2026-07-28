# Contributing to Tāla Lab

Thank you for helping improve Tāla Lab.

## Development

1. Fork and clone the repository.
2. Create a focused branch from `main`.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.
5. Keep changes scoped and preserve local-only audio processing.

Before submitting a pull request, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Pull Requests

- Explain the user-facing problem and the chosen solution.
- Include screenshots for visual changes.
- Test phone and desktop layouts for UI changes.
- Do not commit generated output, credentials, `.env` files, uploaded audio, or
  personal data.
- Add dependencies only when the benefit justifies the maintenance cost.
- Update documentation when behavior or installation steps change.

By contributing, you agree that your contribution is licensed under the
project's MIT License.
