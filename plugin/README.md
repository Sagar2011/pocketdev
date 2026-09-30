# PocketDev Claude Code plugin

By [Sagar](https://github.com/Sagar2011). [MIT license](LICENSE).

Connects local Claude Code activity to the PocketDev desktop companion. Requires Node.js 22+ on PATH and a local graphical desktop. On the first new Claude session it automatically downloads the matching published GitHub release, verifies its checksum, and starts the avatar. Later sessions reuse the cached app. No manual download or app launch is needed. Regular Claude Chat-tab monitoring is not supported.

See the [setup, sound controls, disable and uninstall instructions](https://github.com/Sagar2011/pocketdev#readme).

Use `/pocketdev:help` for startup status, troubleshooting, pause, and uninstall instructions. First setup requires network access; unsigned builds may require OS approval. Only published platform builds are available.

The plugin stores only status metadata locally. It never approves or denies Claude permissions, and does not save prompts, commands, or transcripts.
