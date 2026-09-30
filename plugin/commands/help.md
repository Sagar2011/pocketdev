---
description: PocketDev startup status, troubleshooting, and disable/uninstall help
---

PocketDev's local startup status:

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/runtime.cjs" status`

Explain the status above to the user. PocketDev automatically downloads its matching
published GitHub release on the first new local Claude Code session, verifies SHA-256,
and launches the avatar. Later sessions use the cached app. It requires Node 22+ on
PATH and a supported graphical desktop. No separate ZIP download or npm start is needed.

If startup failed, report the actual error. A 404 means the exact plugin version's
platform archive/checksum has not been published yet; don't download another version.
An OS security approval may be needed for unsigned builds. Never disable Gatekeeper,
remove quarantine, or disable Electron's sandbox. Retry by starting a new Claude
session. A timed-out installer lock expires after ten minutes.

Controls:

- Right-click the avatar, uncheck **Start automatically with Claude**, then choose
  **Quit PocketDev** to pause it. To resume while it is closed, run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/runtime.cjs" enable` only if the user asks.
- To pause startup without the avatar, run
  `node "${CLAUDE_PLUGIN_ROOT}/scripts/runtime.cjs" disable` only if the user asks.
- `claude plugin disable pocketdev@pocketdev-local` prevents startup in new sessions.
- `claude plugin enable pocketdev@pocketdev-local` re-enables hooks. A separate
  automatic-startup pause must also be cleared using `enable` above.
- `claude plugin uninstall pocketdev@pocketdev-local` removes a user-scoped plugin;
  add `--scope project` or `--scope local` for those installations.
- Disabling/uninstalling hooks does not kill an already-running avatar. Quit it
  using its menu. No login item, service, or scheduled task is installed.
- Downloaded versions live in the `runtime` directory under the data path above.
  After quitting and disabling/uninstalling the plugin, that directory may be
  removed to reclaim space. Preferences and custom avatars are outside it; never
  delete the entire data folder without the user's explicit request.

Plugin updates download the new matching app on the next session. If an older avatar
is already running, quit it and start another session to activate the new app.
Status "launched" means the OS accepted the launch, not that a visible window was
verified. If no avatar appears, check OS security prompts and desktop availability.
