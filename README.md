# PocketDev

A little company while you code.

![PocketDev's permission, working, done, and idle poses in the customization window](docs/preview.png)

PocketDev is a small, draggable desktop avatar that reacts to Claude Code. It knocks with a notepad when you are needed, types rapidly and scratches its head while working, jumps with a thumbs-up when Claude finishes responding, and sits eating chips while idle. Use the included animated character or make a miniature version of yourself from **one photo**.

**Public beta.** This repository contains the desktop companion and an installable Claude Code plugin. No hosted backend, telemetry, account system, or agent orchestration. Independent project; not affiliated with Anthropic or OpenAI.

## What works

- Understated mini developer with natural proportions: notepad knock, fast typing with occasional head scratches, thumbs-up, and seated snack breaks.
- Permission and error indicators. Approvals remain in Claude.
- A 120×120 px floating button, adjustable from 48–120 px. Drag to move; hover for status and the ··· menu. Permission/error states show a small attention badge. Reduced motion is supported.
- One-photo customization using your own OpenAI API key, or free import of PNG poses.
- Local activity bridge for Claude Code terminal and local desktop **Code** sessions.

**Regular Claude Chat-tab monitoring is not implemented.** Claude Code hooks are not a general Chat-tab notification API. Remote/SSH/cloud sessions also need a separate transport and are not supported. Do not install this expecting universal Claude monitoring.

## Install and use

Requires **Node.js 22+ on PATH**, local Claude Code, and a graphical desktop. In Claude Code:

```text
/plugin marketplace add Sagar2011/pocketdev
/plugin install pocketdev@pocketdev-local
```

Choose **Install for you**, then start a **new Claude Code session**. PocketDev downloads the matching published companion in the background, verifies its SHA-256 checksum, and starts the avatar automatically. The first download can take a few minutes. Later sessions start from the local cache, including offline. **No manual ZIP download, `npm start`, or separate app launch is needed.** Click the avatar's **···** to customize it.

The companion is an implementation detail of the plugin: it provides the desktop window that a Claude hook cannot draw. It runs as a normal background app, with one avatar per data folder. It does not install a login item, system service, scheduled task, or agent coordinator. Quitting Claude leaves the idle avatar available; use its menu to quit it.

The exact plugin version must have a **published GitHub release** with the platform archive and `.sha256` sidecar. Drafts are unavailable to users. This feature starts with **1.1.0**; a source checkout of this branch cannot download its release before it is published. macOS uses separate Apple Silicon and Intel builds selected automatically, Windows uses an x64 portable ZIP, and Linux uses an x64 AppImage. Only platforms actually built and published are available. Windows/Linux still need native release testing.

### Startup problems and updates

Run `/pocketdev:help` for local startup status and troubleshooting. Node must be available in the environment that starts Claude. Network errors, missing assets, and failed checksums leave Claude usable; try a new session after fixing the cause. A crashed install lock expires after ten minutes. Diagnostics are in `~/.pocketdev/runtime-status.json`; they contain version, time, and setup status, not conversations. A `launched` status confirms that the OS accepted the launch, not that its window appeared.

Plugin updates select the matching new companion version on the next session. If an older avatar is already running, quit it and start a new session to activate the new version. Cached versions are retained so an offline restart or plugin rollback can use them; remove unused versions only after quitting PocketDev.

Unsigned builds may require an OS first-launch approval. Signing/notarization is still needed for a smoother public release; do not disable OS security protections. On Linux, Electron needs a graphical desktop and Chromium runtime libraries (for example GTK, NSS, ALSA, and GBM). The AppImage uses extraction mode so FUSE is not required; Electron's sandbox remains enabled. Desktop behavior under Wayland depends on the window manager.

### Run from source (contributors only)

```sh
npm ci
npm start
```

To load the local plugin while using the development app, skip release downloading for that session:

```sh
POCKETDEV_AUTOSTART=0 claude --plugin-dir ./plugin
```

On PowerShell, set `$env:POCKETDEV_AUTOSTART = '0'` before starting Claude. Remove that environment variable to resume automatic startup. This opt-out is for development; normal users install through the marketplace above.

### Desktop app and Node PATH

If the terminal works but the desktop Code tab does not, the desktop app may not inherit a Node version manager's PATH. Make `node` available to that app, then fully quit and reopen Claude. Check `/hooks` for `node: command not found`. Do not change permission settings or use bypass mode to fix a PATH issue.

## Mute, disable, or uninstall

- **Dismiss a current reminder:** click **×** on the avatar, or right-click → **Dismiss current reminder (no approval)**. This clears the current reminders locally; it never approves or denies anything in Claude. A new request can alert again. Dismissal lasts until the companion exits.
- **Mute sounds:** click the avatar’s **···** and turn off **Permission knocks**, **Typing sound**, and/or **Done chime**. The avatar keeps showing activity.
- **Stop animations:** turn off **Animate** in settings.
- **Close the avatar:** right-click it and choose **Quit PocketDev**. A new Claude session starts it again. To keep it off, first uncheck **Start automatically with Claude** in the same menu. If the avatar is closed, `/pocketdev:help` explains how to re-enable startup. Contributor `npm start` sessions can also be stopped with **Ctrl+C**.

To disable the installed plugin without removing it, run in a terminal:

```sh
claude plugin disable pocketdev@pocketdev-local
```

Start a new Claude Code session afterward. Quit the companion too if you want it off your desktop. To re-enable later:

```sh
claude plugin enable pocketdev@pocketdev-local
```

Start a new Claude Code session. If you separately paused **Start automatically with Claude**, re-enable it through `/pocketdev:help` too. For a temporary `claude --plugin-dir ./plugin` test, exit that session and launch Claude without `--plugin-dir` instead.

To uninstall the marketplace plugin:

```sh
claude plugin uninstall pocketdev@pocketdev-local
```

The command above targets a user installation. For project or local installations, run it from that project and add `--scope project` or `--scope local` respectively. Restart Claude afterward.

Disabling or uninstalling the plugin prevents startup in new sessions but does not close an already-running avatar; choose **Quit PocketDev**. After quitting, you may delete `~/.pocketdev/runtime/` to remove downloaded companions. Custom avatars and preferences live elsewhere under `~/.pocketdev` (or your configured `POCKETDEV_HOME`) and are preserved. Delete the whole folder only if you also want to erase them.

## Make a mini version of yourself

1. Click the avatar's **···**, expand **Make it your mini-self**, then choose **Choose a photo**.
2. Select one clear PNG, JPEG, or WebP under 10 MB.
3. Enter your own OpenAI API key and click **Create my mini-self**.
4. PocketDev creates waiting, working, done, and idle images, **one request at a time**. It uses the original photo for each pose and the first generated pose as a style reference for the remaining poses. Your face, hair, clothing, and existing accessories are preserved in the prompt; glasses or costumes are not added.
5. The completed set becomes active automatically. Click the four preview cards to see each pose on your desktop.

The current integration uses `gpt-image-1.5`, medium quality, 1024×1024 transparent PNGs, through the official Images edits API. It makes **four paid API requests**. A Claude or ChatGPT subscription does not cover that API usage; access and billing depend on your OpenAI account. Check [current pricing](https://developers.openai.com/api/docs/pricing) before generating.

**Animation detail:** custom images are four illustrations with gentle motion and pose transitions, not a generated skeletal rig or frame-by-frame video. The bundled default character uses four textured 3D-style sprite sheets with four poses each, animated with CSS. Typing alternates hand positions, working includes a head scratch, permission shows knocking, and idle brings chips to the mouth. These are stylized frame sequences, not a live 3D rig. Generated pose consistency and likeness can vary. No paid image-generation request is needed to run the default character.

There are no automatic retries. On an error, later requests stop and your current avatar remains active. Completed images are kept in a new local `avatars/custom-*` folder. You can recover them there. Retrying starts all four requests again. Stopping or closing the window cancels the client request, but an already-started provider request may still be billed.

### Use your own artwork for free

Create square PNGs with matching scale and transparent backgrounds:

```text
waiting.png   # notepad pose
working.png   # laptop pose
done.png      # thumbs-up pose
idle.png      # seated with chips (optional for older packs)
```

Click **Import poses** and select the three required files, plus `idle.png` if available. Older three-pose packs keep working, using their waiting image during idle. Each file must be under 10 MB. They can be drawn by you or made with another service; this route makes no API calls. Click **Use default buddy** to switch back. It keeps your custom files.

## What each state means

| State                         | Meaning                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Notepad knock                 | Waiting for your answer or permission                                           |
| Seated with chips             | No active work, or ready for the next prompt                                    |
| Rapid typing and head scratch | Claude is processing a prompt or using a tool                                   |
| Permission bubble             | Claude's permission request needs your attention                                |
| Thumbs-up                     | Claude finished responding; this does **not** prove its task or tests succeeded |
| Needs attention               | A tool or response failed                                                       |

Thumbs-up returns to the snack break after six seconds. Session-end events clear the session. Events expire after 30 minutes without an update, so a crashed terminal cannot leave the avatar working forever; a very long quiet operation may therefore show the disconnected state. When more than one local session exists, permission requests take priority, otherwise the most recent event wins. PocketDev does not launch or coordinate agents.

## Privacy and local files

- Activity is written to `~/.pocketdev/sessions/` (`%USERPROFILE%\.pocketdev\sessions` on Windows).
- The plugin saves status, timestamps, a sanitized tool name, and hashed session/agent/request identifiers to correlate permission requests with tool completions. It does not save commands, prompts, working directories, or transcripts.
- Preferences and avatar packs live under `~/.pocketdev/`. Closed/stale session files are pruned after one day while the companion runs.
- The original photo and API key remain in memory while customizing. PocketDev does not persist either. Closing customization clears the selected photo and stops active generation.
- First-time setup and plugin version updates download the matching release archive and checksum from **GitHub**. Cached starts need no network. SHA-256 checks transfer integrity; it is not an independent publisher signature.
- Clicking Generate sends the selected photo to **OpenAI**. The companion makes no other application-level network requests. Provider processing and retention are governed by that provider's policies.
- Renderer windows are sandboxed, use context isolation and a restrictive Content Security Policy, and cannot navigate to remote pages.
- `POCKETDEV_HOME` can override the local data directory. Set it consistently for the app and Claude if you use it.

## Develop and test

```sh
npm ci
npm test
npm start
```

The Node tests cover the real hook executable, state precedence/expiry, malformed input, and sequential image requests using a fake provider. They make **no paid API calls**.

The desktop smoke test opens the real app with temporary data, checks all poses and settings, and sends hook events into the live window. It needs a graphical desktop:

macOS/Linux:

```sh
POCKETDEV_TEST_NODE="$(command -v node)" npm run test:desktop
```

Windows PowerShell:

```powershell
$env:POCKETDEV_TEST_NODE = (Get-Command node).Source
npm run test:desktop
```

Set `POCKETDEV_SCREENSHOTS` to a folder to save UI captures during that test. Keep API keys and personal photos out of issues, screenshots, and commits.

## Build an installable app

On the target operating system:

```sh
npm ci
npm test
npm run dist
```

Output goes to `dist/`: architecture-specific ZIP on macOS, portable ZIP on Windows, AppImage on Linux. The release workflow adds a `.sha256` sidecar for each archive; the plugin requires both files. `npm run pack` produces an unpacked app for local testing. Packaging is configured for all three platforms; see [release guidance](CONTRIBUTING.md) before advertising them as tested releases.

Unsigned development builds can trigger operating-system warnings. Public macOS releases should be signed and notarized; Windows releases should be code-signed. Signing credentials are not included. Do not instruct users to disable operating-system security protections.

## Small by design

```text
app/             Electron app, vanilla UI, bundled textured sprite mascot, image API integration
plugin/          Claude hooks, release bootstrap, local status writer, and help command
.claude-plugin/  Installable marketplace manifest
test/            Node checks and a real desktop smoke test
```

There is no frontend framework, database, web server, MCP server, or provider abstraction. Electron makes the download larger than a native app, but keeps the project in one language with a straightforward contributor setup. Node and Chromium are bundled with the companion; the external hook still needs Node on PATH.

## License

Code and bundled default artwork are distributed under the [MIT license](LICENSE). See [artwork notes](app/assets/buddy/README.md) for generation provenance. Uploaded photos and user-generated avatar packs are not part of this repository's license; use images you have permission to use and follow your generation provider's terms.

See [CONTRIBUTING.md](CONTRIBUTING.md) for small changes and releases. Technical references: [Claude hooks](https://code.claude.com/docs/en/hooks), [Claude plugin reference](https://code.claude.com/docs/en/plugins-reference), [OpenAI image edits](https://developers.openai.com/api/reference/resources/images/methods/edit), and [Electron security](https://www.electronjs.org/docs/latest/tutorial/security).

Permission requests repeat double knocks every six seconds until a matching tool completion, turn/session reset, expiry, or local dismissal. Volume increases for the first three rounds, then stays capped. Working plays quiet typing; completion plays one short chime. Settings has independent **Permission knocks**, **Typing sound**, and **Done chime** toggles. Existing muted preferences remain muted. Existing avatar sizes are preserved; use the size slider to choose 120 px.

Idle stays silent: the default buddy gently sways and cycles through eating chips; custom idle images gently sway. Enable **Animate** to see motion (system Reduce Motion is respected). **Preview permission alert** runs for 30 seconds so you can hear repeated knocks; clicking another pose ends the preview early.

Claude does not emit a hook for every approval or interruption. After approving a long-running tool or pressing Escape in Claude, click the avatar’s **×** if the reminder continues; PocketDev cannot promise immediate automatic detection. Pending permissions are tracked separately from unrelated tools. Live permissions take priority over previews, and new live activity ends a preview.
