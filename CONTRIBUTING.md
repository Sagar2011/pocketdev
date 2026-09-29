# Contributing

Keep PocketDev small. A focused fix or character improvement is more useful than a framework rewrite. Discuss new services or dependencies in an issue first.

1. Install Node 22+ and run `npm ci`.
2. Make one focused change.
3. Run `npm test`. For UI or bridge changes, also run the desktop smoke test documented in README.md and inspect the actual app.
4. Explain the behavior change and what you tested in your pull request.

The original mascot is in `app/mascot.js`; motion is in `app/mascot.css`. Both use standard SVG/CSS. Preserve reduced-motion support and make poses readable at the smallest size.

The bridge must remain silent, fail-open, and independent of Claude's permission decisions. Never add prompt/command/transcript collection. Do not hardcode local usernames, credentials, or personal images.

## Publishing the repository

The local folder is ready to become a Git repository. Review it, run `git init`, and publish it under your own GitHub account when ready. There is no preconfigured remote and nothing is uploaded by setup. Once published, replace `YOUR_GITHUB_OWNER` in the README's marketplace example with your actual account. Enable private vulnerability reporting in GitHub settings.

## Releases

1. Update versions in `package.json`, `plugin/.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`; refresh `package-lock.json` with `npm install --package-lock-only`.
2. Run tests and smoke-test the app and a real Claude permission prompt on each platform you claim to support.
3. Build with `npm run dist` on that platform. The manual **Build desktop** GitHub Action can build one selected platform per run; it uploads build artifacts and does not publish a release.
4. Configure signing/notarization using [electron-builder signing documentation](https://www.electron.build/code-signing). Signing credentials belong in secrets, never the repository. The included manual CI build disables certificate discovery and creates unsigned test artifacts.
5. Create a GitHub release, upload verified platform artifacts, and describe limitations. Keep the companion app download distinct from the Claude plugin installation instructions.

### Draft release from GitHub Actions

Push reviewed code and matching app/plugin/marketplace versions to `main`. Open **Actions → Release PocketDev → Run workflow**, select **main**, and choose one platform. macos-15 builds Apple Silicon, windows-2022 builds x64 Windows, and ubuntu-24.04 builds x64 Linux. Builds run one at a time and remain unsigned.

The workflow runs unit tests (plus desktop smoke tests on macOS), builds the app, and attaches it to a **draft pre-release** using the built-in GitHub token. No personal token or Apple credentials are needed. Only the draft job has release-write permission; it does not execute repository code. Actions are pinned to commit hashes.

Run another platform against the same commit to add its download to the same draft. Reruns may replace assets only on a draft from that exact commit. A published release or a tag/draft pointing to different code is never overwritten. For changes after a published release, increase versions first.

Open the draft link in the workflow summary, manually test the downloads, review the notes, then click **Publish release**. Windows/Linux builds require their own manual smoke tests before advertising support. The workflow never publishes the draft automatically. There is no app auto-updater.

## Current validation boundary

Node tests and the desktop smoke test can run without a provider account. Live photo generation requires a photo and a billable OpenAI API key; mocked API tests do not prove model access or output quality. Cross-platform configuration is not evidence that Windows/Linux installers have been tested. Do not claim unsupported coverage in release notes.
