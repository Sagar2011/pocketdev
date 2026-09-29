# PocketDev

A little company while you code.

![PocketDev's permission, working, done, and idle poses in the customization window](docs/preview.png)

PocketDev is a small, draggable desktop avatar that reacts to Claude Code. It knocks with a notepad when you are needed, types rapidly and scratches its head while working, jumps with a thumbs-up when Claude finishes responding, and sits eating chips while idle. Use the included animated character or make a miniature version of yourself from **one photo**.

**Early v0.1.0.** This repository contains the desktop companion and an installable Claude Code plugin. No hosted backend, telemetry, account system, or agent orchestration. Independent project; not affiliated with Anthropic or OpenAI.

## What works

- Understated mini developer with natural proportions: notepad knock, fast typing with occasional head scratches, thumbs-up, and seated snack breaks.
- Permission and error indicators. Approvals remain in Claude.
- A 120×120 px floating button, adjustable from 48–120 px. Drag to move; hover for status and the ··· menu. Permission/error states show a small attention badge. Reduced motion is supported.
- One-photo customization using your own OpenAI API key, or free import of PNG poses.
- Local activity bridge for Claude Code terminal and local desktop **Code** sessions.

**Regular Claude Chat-tab monitoring is not implemented.** Claude Code hooks are not a general Chat-tab notification API. Remote/SSH/cloud sessions also need a separate transport and are not supported. Do not install this expecting universal Claude monitoring.

## Quick start from source

1. Install [Node.js 22 LTS or newer](https://nodejs.org/) and [Claude Code](https://code.claude.com/docs/en/setup). Ensure `node --version` works in the shell that launches Claude. Node is needed by the plugin even when using a packaged desktop app.
2. Download this repository as a ZIP and extract it, or clone your published fork. Open a terminal **inside the PocketDev folder**.
3. Run:

   ```sh
   npm ci
   npm start
   ```

4. A button-sized avatar and its customization window appear. Old larger avatar sizes reset to the new 120 px default. Close the customization window to leave just the avatar. Click **···** on the avatar to reopen it; right-click **···** for Quit.
5. Connect the plugin using the instructions below.

There is no dev web server to start. `npm start` launches the whole companion. The terminal remains occupied while running from source; a packaged app launches normally from your applications folder.

macOS and Windows use the standard Node installer. On Linux, Electron also needs a graphical desktop and Chromium runtime libraries. Ubuntu users can install these with `sudo apt install libgtk-3-0 libnss3 libasound2t64 libgbm1`. Package names vary by distribution. Native Linux desktop behavior, especially always-on-top and placement under Wayland, depends on your window manager.

## Install the Claude plugin

The companion must be running to display events. You only install the plugin once.

Inside Claude Code, add the repository folder as a local marketplace. Replace `/absolute/path/to/pocketdev` with the folder you extracted:

```text
/plugin marketplace add /absolute/path/to/pocketdev
/plugin install pocketdev@pocketdev-local
```

Start a **new Claude Code session**, send a prompt, and watch the avatar. Use `/hooks` to inspect the installed hooks. Local Code-tab sessions use Claude Code hooks too; restart the session after installation.

For a temporary test without installation, run this from the repository folder:

```sh
claude --plugin-dir ./plugin
```

Once this repository is published to GitHub, users can instead run `/plugin marketplace add YOUR_GITHUB_OWNER/pocketdev`, followed by the same `/plugin install` command. Replace `YOUR_GITHUB_OWNER` with your real account or organization. The marketplace manifest is already included; this project has not been published automatically.

### Desktop app and Node PATH

If the terminal works but the desktop Code tab does not, the desktop app may not inherit a Node version manager's PATH. Make `node` available to that app, then fully quit and reopen Claude. Check `/hooks` for `node: command not found`. Do not change permission settings or use bypass mode to fix a PATH issue.

## Make a mini version of yourself

1. Click the avatar's **···**, expand **Make it your mini-self**, then choose **Choose a photo**.
2. Select one clear PNG, JPEG, or WebP under 10 MB.
3. Enter your own OpenAI API key and click **Create my mini-self**.
4. PocketDev creates waiting, working, done, and idle images, **one request at a time**. It uses the original photo for each pose and the first generated pose as a style reference for the remaining poses. Your face, hair, clothing, and existing accessories are preserved in the prompt; glasses or costumes are not added.
5. The completed set becomes active automatically. Click the four preview cards to see each pose on your desktop.

The current integration uses `gpt-image-1.5`, medium quality, 1024×1024 transparent PNGs, through the official Images edits API. It makes **four paid API requests**. A Claude or ChatGPT subscription does not cover that API usage; access and billing depend on your OpenAI account. Check [current pricing](https://developers.openai.com/api/docs/pricing) before generating.

**Animation detail:** custom images are four illustrations with gentle motion and pose transitions, not a generated skeletal rig or frame-by-frame video. The default vector character has individually animated parts. Generated pose consistency and likeness can vary. No paid image-generation request is needed to run the default character.

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

| State | Meaning |
| --- | --- |
| Notepad knock | Waiting for your answer or permission |
| Seated with chips | No active work, or ready for the next prompt |
| Rapid typing and head scratch | Claude is processing a prompt or using a tool |
| Permission bubble | Claude's permission request needs your attention |
| Thumbs-up | Claude finished responding; this does **not** prove its task or tests succeeded |
| Needs attention | A tool or response failed |

Thumbs-up returns to the snack break after six seconds. Session-end events clear the session. Events expire after 30 minutes without an update, so a crashed terminal cannot leave the avatar working forever; a very long quiet operation may therefore show the disconnected state. When more than one local session exists, permission requests take priority, otherwise the most recent event wins. PocketDev does not launch or coordinate agents.

## Privacy and local files

- Activity is written to `~/.pocketdev/sessions/` (`%USERPROFILE%\.pocketdev\sessions` on Windows).
- The plugin saves only a state, timestamp, and sanitized tool name under a hashed session filename. It does not save commands, prompts, working directories, or transcripts.
- Preferences and avatar packs live under `~/.pocketdev/`. Closed/stale session files are pruned after one day while the companion runs.
- The original photo and API key remain in memory while customizing. PocketDev does not persist either. Closing customization clears the selected photo and stops active generation.
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

Output goes to `dist/`: ZIP on macOS, NSIS installer on Windows, AppImage on Linux. `npm run pack` produces an unpacked app for local testing. Packaging is configured for all three platforms; see [release guidance](CONTRIBUTING.md) before advertising them as tested releases.

Unsigned development builds can trigger operating-system warnings. Public macOS releases should be signed and notarized; Windows releases should be code-signed. Signing credentials are not included. Do not instruct users to disable operating-system security protections.

## Small by design

```text
app/             Electron app, vanilla UI, original SVG mascot, image API integration
plugin/          Claude plugin manifest, hooks, and tiny local status writer
.claude-plugin/  Installable marketplace manifest
test/            Node checks and a real desktop smoke test
```

There is no frontend framework, database, web server, MCP server, or provider abstraction. Electron makes the download larger than a native app, but keeps the project in one language with a straightforward contributor setup. Node and Chromium are bundled with the companion; the external hook still needs Node on PATH.

## License

Code and the original default vector artwork are [MIT licensed](LICENSE). Uploaded photos and user-generated avatar packs are not part of this repository's license; use images you have permission to use and follow your generation provider's terms.

See [CONTRIBUTING.md](CONTRIBUTING.md) for small changes and releases. Technical references: [Claude hooks](https://code.claude.com/docs/en/hooks), [Claude plugin reference](https://code.claude.com/docs/en/plugins-reference), [OpenAI image edits](https://developers.openai.com/api/reference/resources/images/methods/edit), and [Electron security](https://www.electronjs.org/docs/latest/tutorial/security).

Permission requests repeat double knocks every six seconds until Claude clears the request (or the session ends/expires). Volume increases for the first three rounds, then stays capped. Working plays quiet typing; completion plays one short chime. Settings has independent **Permission knocks**, **Typing sound**, and **Done chime** toggles. Existing muted preferences remain muted. Existing avatar sizes are preserved; use the size slider to choose 120 px.
