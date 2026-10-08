# Contributing

Keep PocketDev small. Prefer a focused fix over a framework, service, or new dependency. Preserve reduced motion, mute controls, metadata-only hooks, and fail-open behavior. Never add automatic permission approval, conversation collection, or secrets to the repository.

## Local checks

Use Node 22+ and run:

```sh
npm ci
npm test
npm run test:desktop
```

The desktop check requires a graphical desktop and uses temporary data. It mocks photo generation and never makes paid requests. `POCKETDEV_TEST_NODE` can override the Node executable; npm normally supplies it. Set `POCKETDEV_SCREENSHOTS` to collect captures.

Run `npm run pack` or `npm run dist` on the platform you are changing. Inspect the actual app; passing DOM assertions is not enough for artwork or audio quality. Describe the trigger, resulting behavior, and verification in a pull request. Do not include private photos, API keys, or transcripts.

Default sprite sheets live in `app/assets/buddy/`. `app/mascot.js` aligns the frames; `app/mascot.css` controls animation. Preserve readability at 48 px. Imported/generated packs remain simple still images with CSS movement.

## Before a public release

Read [the release review](docs/release-review.md). Resolve recording redistribution rights before publishing any archive containing the supplied MP3s. Do not relabel third-party recordings as MIT. Document permission or replace them with appropriately licensed assets, including attribution.

The project currently produces unsigned beta builds. Production distribution requires the relevant signing/notarization setup and native tests on every advertised platform. Store signing credentials in GitHub secrets; never commit them or disable platform security protections. See [electron-builder signing](https://www.electron.build/code-signing).

The bootstrap executes downloads from `Sagar2011/pocketdev`; treat changes to that source, the release workflow, and CODEOWNERS as sensitive. Use branch protection and required `test`/`desktop` checks. GitHub settings are separate from this repository and must be configured by the owner. Enable private vulnerability reporting.

## Automatic release on push to `main`

Every push to `main` runs **Release PocketDev**. It reads the version from `package.json` (validated against the lockfile, plugin and marketplace manifests). If `v<version>` is not public yet, it builds `macos-15` (Apple Silicon), runs tests, uploads a draft, verifies its checksums, and publishes the beta in the same run. If that version is already public, the run skips the build and says so in the summary. So to release: bump all versions together and merge to `main`. A failed or cancelled build/upload does not publish.

This publishes immediately after automated validation. Complete manual acceptance and licensing checks before merging a version bump. It uses the existing GitHub token; no new secrets or variables are needed.

To merge a version bump without releasing it yet (for example to build several platforms as one draft), put `[no release]` in the head commit message, then follow the draft review below.

## Publish in one manual run

To release another platform alone, open **Actions → Release PocketDev → Run workflow**, choose **build-and-publish**, choose your platform, and leave **tag** blank. For multiple platforms in the same version, use **build** for each platform first, then **publish** once. Published versions cannot accept later uploads through this workflow.

## Optional draft review before publishing

1. Finish review and resolve the applicable release blockers. Increment versions together in `package.json`, `plugin/.claude-plugin/plugin.json`, and `.claude-plugin/marketplace.json`. Run `npm install --package-lock-only` to update both lockfile version fields. Never reuse a published version.
2. Run the checks above; validate manifests with `claude plugin validate ./plugin` and `claude plugin validate .`. Merge reviewed changes to `main` with `[no release]` in the head commit message, or the push publishes `macos-15` immediately.
3. Open **Actions → Release PocketDev → Run workflow**, select **main**, choose action **build**, then a platform: `macos-15` (Apple Silicon), `macos-15-intel` (Intel), `windows-2022` (x64), or `ubuntu-24.04` (x64). Build one platform at a time.
4. The workflow verifies matching versions, runs unit tests (and desktop tests on macOS), packages the app, and generates SHA-256 sidecars. Only the separate draft and publish jobs can write releases; neither executes repository code. All third-party actions are pinned to commits.
5. Follow the draft link in the workflow summary. Run other platforms against the **same source commit** to add their artifacts to that draft. No public release is made automatically.
6. Test each downloaded artifact on its native OS. Test startup with empty local data, a real Claude permission prompt, repeated knocks, cancellation/dismissal, completion, mute, idle, custom-avatar import, autostart pause/resume, and an offline restart. Two Claude sessions must still show one avatar. Test plugin-managed installation in a controlled fixture before publication, then verify the actual public download after publication.
7. Confirm licenses, signatures where applicable, platform coverage, checksums, and release notes. Run **Release PocketDev** again from the same `main` commit with action **publish** and the draft tag (for example `v1.1.0`) only after these checks pass. The platform input is ignored for publish. It verifies the draft, matching source/catalog versions, exact platform asset names, and every checksum before publishing a beta. No rebuild is performed. Advertise only the platforms actually tested.

The bootstrap selects exact names: `PocketDev-VERSION-mac-arm64.zip`, `PocketDev-VERSION-mac-x64.zip`, `PocketDev-VERSION-win-x64.zip`, or `PocketDev-VERSION-linux-x64.AppImage`, each with a `.sha256` containing its lowercase digest. Do not rename assets.

A draft or tag pointing at another commit fails deliberately. If code changed during testing, bump the version and create a fresh draft; do not force-move a public tag. Reruns may replace assets only in a draft for the same source commit. Published releases are never overwritten by the workflow.

**Publication timing:** users installing a new plugin version from `main` cannot download its app while the matching release is still a draft. Keep that interval short and announce the plugin update only after all intended artifacts are public. A running older companion must be quit before the new version starts. Cached versions remain for rollback/offline use; there is no polling updater.

## Validation limits

Mocks cannot verify provider access, billing, likeness, or image quality. A macOS test cannot certify Windows/Linux startup, permissions, audio, or OS security handling. `npm audit` covers known advisories, not every vulnerability. SHA-256 sidecars detect corruption but do not replace publisher signatures. State polling scans retained local event files; it is intended for personal desktop use, not fleet-scale monitoring.

## Marketplace publishing and credentials

The public `.claude-plugin/marketplace.json` in this repository already publishes the **pocketdev-local** catalog. There is no extra marketplace upload API. The workflow's **publish** action makes the exact-version companion downloads available so users of that catalog can run the plugin. It does not push commits, edit the catalog, change versions, or bypass branch protection.

**No repository variables, personal access token, Anthropic API key, or OpenAI key are needed.** GitHub supplies the per-run `GITHUB_TOKEN`; build jobs have `contents: read`, and draft/publish jobs request `contents: write`. The workflow exposes it only as the `GH_TOKEN` environment variable for GitHub CLI. Repository/organization policy must allow that permission; a tag ruleset may also restrict tag creation. Resolve policy conflicts explicitly instead of adding a broad personal token. Any future signing credentials belong under **Settings → Secrets and variables → Actions → Secrets**, never plain Variables.

For a single-platform (Apple Silicon) release: bump versions and merge reviewed code to `main`; the push publishes it. If you need multiple platforms or a draft review first, build each intended platform from the same commit, test the downloads, then dispatch **publish** with the tag. A stale source commit, public release, unknown asset, absent archive/checksum, or mismatched digest fails publication. Resolve the [open release findings](docs/release-review.md), especially audio rights, before selecting publish; checksum validation cannot establish licenses or native acceptance.

Listing beyond your own marketplace is separate. According to [Anthropic's publishing documentation](https://code.claude.com/docs/en/plugins/publish), directory submissions go through [the developer portal](https://claude.ai/directory/manage); a paid claude.ai plan is required. The official `claude-plugins-official` marketplace has a separate partner-contact route. This workflow does not automate either listing. PocketDev's hooks require local Claude Code and must not be advertised as general Claude Chat/Cowork support.
