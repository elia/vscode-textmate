# Repository Guidelines

## Project Structure & Module Organization
- `extension.js`: Entry point; activates features from `src/*`.
- `src/*.js`: Feature modules exporting `activate(context)` (and optional `deactivate`).
- `src/*.json`: Partial manifest fragments (`contributes.configuration`, `contributes.commands`, `contributes.keybindings`).
- `package.src.json`: Base manifest. `package.json` is generated — do not edit by hand.
- `bin/`: Helper scripts (`build`, `dev`, `release`).
- `test/`: VS Code integration tests (`test/suite/*.test.js`).

## Build, Test, and Development Commands
- Install deps: `yarn install` (or `npm install`).
- Build manifest: `bin/build` (Ruby script; merges `src/*.json` into `package.json`).
- Watch + rebuild: `node bin/dev` (re-runs build on changes under `src/`).
- Install locally: `bin/install` (builds, packages, and installs extension from disk).
- Lint: `npm run lint` (ESLint over the repo).
- Test: `npm test` (runs @vscode/test-electron + Mocha).
- Release: `bin/release vX.Y.Z` (updates `VERSION`, rebuilds, tags, pushes, and runs `vsce publish`; requires `npx vsce login`).

## Coding Style & Naming Conventions
- Code should be clean and concise, make it readable like english.
- It's too complex, simplify it.
- Avoid shortened names (e.g., `cmd` → `command`), pick a significant single word where possible.
- JavaScript (ES2018), CommonJS modules, Node/VSC API context.
- Indentation: 2 spaces; prefer double quotes; avoid semicolons.
- Filenames: camelCase for features (e.g., `joinLines.js` + `joinLines.json`).
- Command IDs: prefix with `vscode-textmate.` (e.g., `vscode-textmate.joinLines`).
- Keep logic small and composable; expose `activate()` that registers commands via `vscode.commands.registerCommand`.
- Prefer `let` over `const`, except for ALL-CAPS constants that are significative.

## Testing Guidelines
- Framework: Mocha (TDD UI) via `@vscode/test-electron`.
- Location: `test/suite/*.test.js` (e.g., `joinLines.test.js`).
- Run: `npm test`. Aim for focused tests that exercise commands and behaviors (open a workspace, invoke command, assert editor state).

## Commit & Pull Request Guidelines
- Commits: imperative mood, concise subject (≤72 chars), group related changes. Use `bin/release` for version bumps ("Release vX.Y.Z").
- PRs: clear description, linked issues, repro/verification steps, and screenshots/GIFs for UI or keybinding changes. Update docs as needed.

## Security & Configuration Tips
- Target VS Code `^1.77.0`; extension supports untrusted/virtual workspaces—avoid operations requiring full trust by default.
- Never hand-edit generated files (`package.json`); run `bin/build` instead.
