# Contributing

Keep PocketDev small. A focused fix or character improvement is more useful than a framework rewrite. Discuss new services or dependencies in an issue first.

1. Install Node 22+ and run `npm ci`.
2. Make one focused change.
3. Run `npm test`. For UI or bridge changes, also run the desktop smoke test documented in README.md and inspect the actual app.
4. Explain the behavior change and what you tested in your pull request.

The default sprite sheets are in `app/assets/buddy/`. `app/mascot.js` clips and aligns their frames using SVG view boxes; `app/mascot.css` controls frame timing and movement. No animation library is needed. Preserve reduced-motion support and make poses readable at the smallest size.

The bridge must remain silent, fail-open, and independent of Claude's permission decisions. Never add prompt/command/transcript collection. Do not hardcode local usernames, credentials, or personal images.

## Publishing the repository

The public repository is `Sagar2011/pocketdev`. Enable private vulnerability reporting in GitHub settings. Changes to the bootstrap download source must be reviewed as executable-code distribution changes.

## Releases

1. Update versions in `package.json`, `plugin/.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`; refresh `package-lock.json` with `npm install --package-lock-only`.
2. Run tests and smoke-test the app and a real Claude permission prompt on each platform you claim to support.
3. Build with `npm run dist` on that platform. The manual **Build desktop** GitHub Action can build one selected platform per run; it uploads build artifacts and does not publish a release.
4. Configure signing/notarization using [electron-builder signing documentation](https://www.electron.build/code-signing). Signing credentials belong in secrets, never the repository. The included manual CI build disables certificate discovery and creates unsigned test artifacts.
5. Create a GitHub release, upload verified platform artifacts, and describe limitations. Include each platform archive and its `.sha256` sidecar. Users install through the Claude marketplace; the plugin downloads and starts the companion automatically.

### Draft release from GitHub Actions

Push reviewed code and matching app/plugin/marketplace versions to `main`. Open **Actions → Release PocketDev → Run workflow**, select **main**, and choose one platform. macos-15 builds an Apple Silicon ZIP, macos-15-intel builds an Intel Mac ZIP, windows-2022 builds an x64 Windows portable ZIP, and ubuntu-24.04 builds an x64 Linux AppImage. Keep the configured artifact names: the bootstrap selects them exactly. Builds run one at a time and remain unsigned.

The workflow runs unit tests (plus desktop smoke tests on macOS), builds the app, and attaches it to a **draft pre-release** using the built-in GitHub token. No personal token or Apple credentials are needed. Only the draft job has release-write permission; it does not execute repository code. Actions are pinned to commit hashes.

Run another platform against the same commit to add its download to the same draft. Reruns may replace assets only on a draft from that exact commit. A published release or a tag/draft pointing to different code is never overwritten. For changes after a published release, increase versions first.

Open the draft link in the workflow summary, manually test the downloads, review the notes, then click **Publish release**. Windows/Linux builds require their own manual smoke tests before advertising support. The workflow never publishes the draft automatically. The plugin downloads its exact matching version on a new session; a running older app must be quit before the new one starts. There is no independent polling updater. Publish the matching assets before announcing the plugin update. While a new version is on main but its release is still a draft, first-time installation of that version reports a missing-release error and retries on a later session.

## Current validation boundary

Node tests and the desktop smoke test can run without a provider account. Live photo generation requires a photo and a billable OpenAI API key; mocked API tests do not prove model access or output quality. Cross-platform configuration is not evidence that Windows/Linux installers have been tested. Do not claim unsupported coverage in release notes.

## Plugin bootstrap checks

`npm test` covers release selection, checksum rejection, partial-install cleanup, offline cache reuse, concurrent setup, crash-lock recovery, and the real SessionStart hook with a harmless cached executable. It never downloads a release or makes paid API calls. `npm run test:desktop` disables release bootstrap and exercises the actual UI.

Before publishing, test from an empty `POCKETDEV_HOME` on a desktop: install the plugin, start a new Claude session, wait for the first download, and confirm the avatar appears without a setup window. Start a second Claude session and confirm there is only one avatar and settings do not open. Test a real permission prompt, response completion, startup pause, Quit, re-enable, and restart offline. Do not count mocked downloads or another OS's tests as native platform validation.
