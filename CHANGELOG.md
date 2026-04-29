# Changelog

All notable changes to the Elnora CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.5.3](https://github.com/Elnora-AI/elnora-cli/compare/v1.5.2...v1.5.3) (2026-04-29)


### Bug Fixes

* **release:** unblock v1.5.x publishing + Windows spawn resolution ([#113](https://github.com/Elnora-AI/elnora-cli/issues/113)) ([32e263d](https://github.com/Elnora-AI/elnora-cli/commit/32e263d02d7bb7ca52517987c2e51383de5968a1))

## [1.5.2](https://github.com/Elnora-AI/elnora-cli/compare/v1.5.1...v1.5.2) (2026-04-29)


### Bug Fixes

* **setup:** register marketplace via `claude plugin marketplace add` ([#111](https://github.com/Elnora-AI/elnora-cli/issues/111)) ([c592807](https://github.com/Elnora-AI/elnora-cli/commit/c592807f6c3d23b7c68b7fbd9126fd94bf522f70))

## [1.5.1](https://github.com/Elnora-AI/elnora-cli/compare/v1.5.0...v1.5.1) (2026-04-28)


### Bug Fixes

* **installer:** Windows ARM64 build + iex-safe error handling ([#109](https://github.com/Elnora-AI/elnora-cli/issues/109)) ([a07ca67](https://github.com/Elnora-AI/elnora-cli/commit/a07ca675ca0cc4f71508b3bb43e7d5277f7b6ff4))

## [1.5.0](https://github.com/Elnora-AI/elnora-cli/compare/v1.4.0...v1.5.0) (2026-04-21)


### Features

* **commands:** add `protocols.generate` — create a task and send its description in one call ([#105](https://github.com/Elnora-AI/elnora-cli/issues/105))
* **ci:** enforce command parity between the CLI and the hosted MCP server ([#105](https://github.com/Elnora-AI/elnora-cli/issues/105))
* **ci:** lint PR titles to conventional-commits format ([#106](https://github.com/Elnora-AI/elnora-cli/issues/106)) ([8b867c9](https://github.com/Elnora-AI/elnora-cli/commit/8b867c90c5eb1852a4df3cbf3d377f475163eafb))

## [1.4.0](https://github.com/Elnora-AI/elnora-cli/compare/v1.3.5...v1.4.0) (2026-04-20)


### Features

* dual-mode skills, trigger cleanup, enhanced doctor, CI smoke tests ([#102](https://github.com/Elnora-AI/elnora-cli/issues/102)) ([201ffc4](https://github.com/Elnora-AI/elnora-cli/commit/201ffc44af6cc399405b96b9df386a672b4b199c))


### Bug Fixes

* **doctor:** unbreak plugin-version test across release bumps ([#104](https://github.com/Elnora-AI/elnora-cli/issues/104)) ([586abcb](https://github.com/Elnora-AI/elnora-cli/commit/586abcb93a8738183e67ea8710b36594b42bf47f))

## [1.3.5](https://github.com/Elnora-AI/elnora-cli/compare/v1.3.4...v1.3.5) (2026-04-17)


### Bug Fixes

* resolve critical usability issues blocking first-time install (ELN-627, ELN-628, ELN-629, ELN-630, ELN-631) ([#99](https://github.com/Elnora-AI/elnora-cli/issues/99)) ([26d55c8](https://github.com/Elnora-AI/elnora-cli/commit/26d55c87b2c5481481d096e65984c9049ab526d6))

## [1.3.4](https://github.com/Elnora-AI/elnora-cli/compare/v1.3.3...v1.3.4) (2026-04-13)


### Bug Fixes

* simplify update skill to follow printed instructions ([#93](https://github.com/Elnora-AI/elnora-cli/issues/93)) ([611ed69](https://github.com/Elnora-AI/elnora-cli/commit/611ed69d32759863490668850f876eea72fc56e4))

## [1.3.3](https://github.com/Elnora-AI/elnora-cli/compare/v1.3.2...v1.3.3) (2026-04-13)


### Bug Fixes

* use npm install [@latest](https://github.com/latest) instead of npm update for upgrades ([#91](https://github.com/Elnora-AI/elnora-cli/issues/91)) ([091a144](https://github.com/Elnora-AI/elnora-cli/commit/091a144aec06c7540f555a27f42c5b85291fdabf))

## [1.3.2](https://github.com/Elnora-AI/elnora-cli/compare/v1.3.1...v1.3.2) (2026-04-13)


### Bug Fixes

* use build-npm.mjs to inject version into npm package ([#89](https://github.com/Elnora-AI/elnora-cli/issues/89)) ([7e050ce](https://github.com/Elnora-AI/elnora-cli/commit/7e050ce8d6653dbdfe956e24c51c3d22702a2eb4))

## [1.3.1](https://github.com/Elnora-AI/elnora-cli/compare/v1.3.0...v1.3.1) (2026-04-13)


### Bug Fixes

* clarify project ID workflow in skills to reduce Claude Code confusion ([#86](https://github.com/Elnora-AI/elnora-cli/issues/86)) ([919b099](https://github.com/Elnora-AI/elnora-cli/commit/919b0996aaaf4b1bf2096683919bacbb4adda661))
* make update check-only by default, add --install flag ([#88](https://github.com/Elnora-AI/elnora-cli/issues/88)) ([bb33825](https://github.com/Elnora-AI/elnora-cli/commit/bb338257648c8d5f975982c021805404cdaefc3d))

## [1.3.0](https://github.com/Elnora-AI/elnora-cli/compare/v1.2.1...v1.3.0) (2026-04-13)


### Features

* add multi-platform setup and fix plugin distribution ([#84](https://github.com/Elnora-AI/elnora-cli/issues/84)) ([b1fb025](https://github.com/Elnora-AI/elnora-cli/commit/b1fb0259b618b232962fbd15e3b32f8fbc61772d))

## [1.2.1](https://github.com/Elnora-AI/elnora-cli/compare/v1.2.0...v1.2.1) (2026-04-13)


### Bug Fixes

* use RELEASE_BOT_PAT for cross-repo release steps ([#82](https://github.com/Elnora-AI/elnora-cli/issues/82)) ([5421aa1](https://github.com/Elnora-AI/elnora-cli/commit/5421aa1979417167b2e25eff4d75f023c9b750f2))

## [1.2.0](https://github.com/Elnora-AI/elnora-cli/compare/v1.1.3...v1.2.0) (2026-04-13)


### Features

* **orgs:** add resend-invite command and smart invite upsert (ELN-619) ([#76](https://github.com/Elnora-AI/elnora-cli/issues/76)) ([e8b0736](https://github.com/Elnora-AI/elnora-cli/commit/e8b0736cba48e6f920488432818a2acdcdfdb0ee))


### Bug Fixes

* align CLI streaming skills and add MCP error visibility ([#80](https://github.com/Elnora-AI/elnora-cli/issues/80)) ([910d944](https://github.com/Elnora-AI/elnora-cli/commit/910d944dffa49fa3404f589e0fa1b7bef9748fbc))

## [1.1.3](https://github.com/Elnora-AI/elnora-cli/compare/cli-v1.1.2...cli-v1.1.3) (2026-04-09)


### Bug Fixes

* CLI post-release fixes — publishing, cleanup, onboarding, and streaming ([#56](https://github.com/Elnora-AI/elnora-cli/issues/56)) ([ff8807b](https://github.com/Elnora-AI/elnora-cli/commit/ff8807bb800a18885d100b76d12b024531dfa501))
* use DEPENDABOT_PAT for cross-repo pushes in release workflow ([#67](https://github.com/Elnora-AI/elnora-cli/issues/67)) ([3d9032c](https://github.com/Elnora-AI/elnora-cli/commit/3d9032c49850c2799c3d0ee66ec81a14f5f587f7))

## [1.1.2](https://github.com/Elnora-AI/elnora-cli/compare/cli-v1.1.1...cli-v1.1.2) (2026-04-04)


### Bug Fixes

* **skills:** rewrite all skills to match TypeScript CLI architecture ([#50](https://github.com/Elnora-AI/elnora-cli/issues/50)) ([e1843ff](https://github.com/Elnora-AI/elnora-cli/commit/e1843ffe3083dcc42c4d3c8428692eee52d1ceb3))

## [1.1.1](https://github.com/Elnora-AI/elnora-cli/compare/cli-v1.1.0...cli-v1.1.1) (2026-04-04)


### Bug Fixes

* add npm provenance for 2FA-free publishing ([#47](https://github.com/Elnora-AI/elnora-cli/issues/47)) ([fe7e3fa](https://github.com/Elnora-AI/elnora-cli/commit/fe7e3fa4ddd72b66598c25a0636315562c992cc7))

## [1.1.0](https://github.com/Elnora-AI/elnora-cli/compare/cli-v1.0.0...cli-v1.1.0) (2026-04-04)


### Features

* add 55 new CLI commands covering all v1 API endpoints ([#8](https://github.com/Elnora-AI/elnora-cli/issues/8)) ([26db63a](https://github.com/Elnora-AI/elnora-cli/commit/26db63ac6fabfcfa293d36dc7eaf747346f3c9bf))
* add automatic update check on CLI startup ([#23](https://github.com/Elnora-AI/elnora-cli/issues/23)) ([6754d92](https://github.com/Elnora-AI/elnora-cli/commit/6754d92f8f6147b2c1db24df6270b3f54dccff43))
* add Claude Code plugin config and skills ([95b6e93](https://github.com/Elnora-AI/elnora-cli/commit/95b6e93952c5c080957aa234585fc1fa0618cc61))
* add CLI source code, README, and project config ([a87303d](https://github.com/Elnora-AI/elnora-cli/commit/a87303d5e7c3c99b24f1eafdcbd574b46d4aabe7))
* add global --org flag for multi-org support ([#25](https://github.com/Elnora-AI/elnora-cli/issues/25)) ([b5cc651](https://github.com/Elnora-AI/elnora-cli/commit/b5cc651330d093a5db0a013952917fc593ce3e08))
* add health command and fix file upload ([#17](https://github.com/Elnora-AI/elnora-cli/issues/17)) ([da029d6](https://github.com/Elnora-AI/elnora-cli/commit/da029d616528b976a45d6124da8c9d07c310473b))
* add profile support for multi-org API key management ([#29](https://github.com/Elnora-AI/elnora-cli/issues/29)) ([e82059c](https://github.com/Elnora-AI/elnora-cli/commit/e82059c0cf185082a13b4e2a7355db66b69f5acb))
* add repo scaffolding — README, CI, issue templates, security policy ([bf6152e](https://github.com/Elnora-AI/elnora-cli/commit/bf6152e32f691f0673352c71d0cf5a1c850d1cfe))
* automatic update check on CLI startup ([#21](https://github.com/Elnora-AI/elnora-cli/issues/21)) ([342e302](https://github.com/Elnora-AI/elnora-cli/commit/342e3027c8433ca3c1ae3f07024ff0a397992727))
* complete CLI skills coverage and add permission defaults ([#18](https://github.com/Elnora-AI/elnora-cli/issues/18)) ([3eda49a](https://github.com/Elnora-AI/elnora-cli/commit/3eda49acc9d60793cccca12eb636d91c67490eec))
* rewrite Elnora CLI from Python to TypeScript ([#41](https://github.com/Elnora-AI/elnora-cli/issues/41)) ([84f9233](https://github.com/Elnora-AI/elnora-cli/commit/84f9233396f6f4aea27580f6867e64afbf23b8d6))


### Bug Fixes

* **ci:** close/reopen release PR to trigger CI checks ([#12](https://github.com/Elnora-AI/elnora-cli/issues/12)) ([7037b4c](https://github.com/Elnora-AI/elnora-cli/commit/7037b4ca33e7f0a8af52215df53f4d1cb57b9a5a))
* **ci:** switch to release-please, remove broken semantic-release ([#10](https://github.com/Elnora-AI/elnora-cli/issues/10)) ([28386cb](https://github.com/Elnora-AI/elnora-cli/commit/28386cb567760c2c9f4c253419be118685fec921))
* **ci:** use PAT for release-please to trigger CI on release PRs ([#15](https://github.com/Elnora-AI/elnora-cli/issues/15)) ([256bd56](https://github.com/Elnora-AI/elnora-cli/commit/256bd56d03890861c0617e84a54e49869849f339))
* **cli:** harden security, add rate-limit retry, and update docs ([#33](https://github.com/Elnora-AI/elnora-cli/issues/33)) ([c201367](https://github.com/Elnora-AI/elnora-cli/commit/c2013677ebc7267f098d3f815392c4b0d70bd9e3))
* **cli:** use correct endpoint key for org delete ([#35](https://github.com/Elnora-AI/elnora-cli/issues/35)) ([be041cb](https://github.com/Elnora-AI/elnora-cli/commit/be041cbd2858ffc17959c718d3c1ea89751e6b79))
* **docs:** clean up README — remove API key format, fix plugin section ([#5](https://github.com/Elnora-AI/elnora-cli/issues/5)) ([561ad61](https://github.com/Elnora-AI/elnora-cli/commit/561ad6130787fe1c9533a7bef54e7a280a85acec))
* remove flags command (feature flags are SystemAdmin-only) ([#27](https://github.com/Elnora-AI/elnora-cli/issues/27)) ([394e747](https://github.com/Elnora-AI/elnora-cli/commit/394e7470a826e7658a0ceeb5c581ca560cf713b6))
* **skills:** correct inaccuracies and add missing commands ([#31](https://github.com/Elnora-AI/elnora-cli/issues/31)) ([a01a4af](https://github.com/Elnora-AI/elnora-cli/commit/a01a4afbdac5e09fd30d4c448923899252c8465b))
* update docs for client-readiness fixes ([06305ba](https://github.com/Elnora-AI/elnora-cli/commit/06305ba2431c37d8e401f02c8ab3f535fec1e92d))
* use macos-latest for Intel Mac builds (macos-13 deprecated) ([#46](https://github.com/Elnora-AI/elnora-cli/issues/46)) ([ce79285](https://github.com/Elnora-AI/elnora-cli/commit/ce79285e624cf9e869df1206a685cf935ef9f8b4))

## [0.7.3](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.7.2...elnora-v0.7.3) (2026-03-16)


### Bug Fixes

* **cli:** use correct endpoint key for org delete ([#35](https://github.com/Elnora-AI/elnora-cli/issues/35)) ([be041cb](https://github.com/Elnora-AI/elnora-cli/commit/be041cbd2858ffc17959c718d3c1ea89751e6b79))

## [0.7.2](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.7.1...elnora-v0.7.2) (2026-03-13)


### Bug Fixes

* **cli:** harden security, add rate-limit retry, and update docs ([#33](https://github.com/Elnora-AI/elnora-cli/issues/33)) ([c201367](https://github.com/Elnora-AI/elnora-cli/commit/c2013677ebc7267f098d3f815392c4b0d70bd9e3))

## [0.7.1](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.7.0...elnora-v0.7.1) (2026-03-13)


### Bug Fixes

* **skills:** correct inaccuracies and add missing commands ([#31](https://github.com/Elnora-AI/elnora-cli/issues/31)) ([a01a4af](https://github.com/Elnora-AI/elnora-cli/commit/a01a4afbdac5e09fd30d4c448923899252c8465b))

## [0.7.0](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.6.1...elnora-v0.7.0) (2026-03-08)


### Features

* add profile support for multi-org API key management ([#29](https://github.com/Elnora-AI/elnora-cli/issues/29)) ([e82059c](https://github.com/Elnora-AI/elnora-cli/commit/e82059c0cf185082a13b4e2a7355db66b69f5acb))

## [0.6.1](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.6.0...elnora-v0.6.1) (2026-03-07)


### Bug Fixes

* remove flags command (feature flags are SystemAdmin-only) ([#27](https://github.com/Elnora-AI/elnora-cli/issues/27)) ([394e747](https://github.com/Elnora-AI/elnora-cli/commit/394e7470a826e7658a0ceeb5c581ca560cf713b6))

## [0.6.0](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.5.0...elnora-v0.6.0) (2026-03-07)


### Features

* add global --org flag for multi-org support ([#25](https://github.com/Elnora-AI/elnora-cli/issues/25)) ([b5cc651](https://github.com/Elnora-AI/elnora-cli/commit/b5cc651330d093a5db0a013952917fc593ce3e08))

## [0.5.0](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.4.0...elnora-v0.5.0) (2026-03-06)


### Features

* add automatic update check on CLI startup ([#23](https://github.com/Elnora-AI/elnora-cli/issues/23)) ([6754d92](https://github.com/Elnora-AI/elnora-cli/commit/6754d92f8f6147b2c1db24df6270b3f54dccff43))

## [0.4.0](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.3.0...elnora-v0.4.0) (2026-03-05)


### Features

* automatic update check on CLI startup ([#21](https://github.com/Elnora-AI/elnora-cli/issues/21)) ([342e302](https://github.com/Elnora-AI/elnora-cli/commit/342e3027c8433ca3c1ae3f07024ff0a397992727))

## [0.3.0](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.2.0...elnora-v0.3.0) (2026-03-05)


### Features

* add health command and fix file upload ([#17](https://github.com/Elnora-AI/elnora-cli/issues/17)) ([da029d6](https://github.com/Elnora-AI/elnora-cli/commit/da029d616528b976a45d6124da8c9d07c310473b))
* complete CLI skills coverage and add permission defaults ([#18](https://github.com/Elnora-AI/elnora-cli/issues/18)) ([3eda49a](https://github.com/Elnora-AI/elnora-cli/commit/3eda49acc9d60793cccca12eb636d91c67490eec))

## [0.2.0](https://github.com/Elnora-AI/elnora-cli/compare/elnora-v0.1.0...elnora-v0.2.0) (2026-03-05)


### Features

* add 55 new CLI commands covering all v1 API endpoints ([#8](https://github.com/Elnora-AI/elnora-cli/issues/8)) ([26db63a](https://github.com/Elnora-AI/elnora-cli/commit/26db63ac6fabfcfa293d36dc7eaf747346f3c9bf))
* add Claude Code plugin config and skills ([95b6e93](https://github.com/Elnora-AI/elnora-cli/commit/95b6e93952c5c080957aa234585fc1fa0618cc61))
* add CLI source code, README, and project config ([a87303d](https://github.com/Elnora-AI/elnora-cli/commit/a87303d5e7c3c99b24f1eafdcbd574b46d4aabe7))
* add repo scaffolding — README, CI, issue templates, security policy ([bf6152e](https://github.com/Elnora-AI/elnora-cli/commit/bf6152e32f691f0673352c71d0cf5a1c850d1cfe))


### Bug Fixes

* **ci:** close/reopen release PR to trigger CI checks ([#12](https://github.com/Elnora-AI/elnora-cli/issues/12)) ([7037b4c](https://github.com/Elnora-AI/elnora-cli/commit/7037b4ca33e7f0a8af52215df53f4d1cb57b9a5a))
* **ci:** switch to release-please, remove broken semantic-release ([#10](https://github.com/Elnora-AI/elnora-cli/issues/10)) ([28386cb](https://github.com/Elnora-AI/elnora-cli/commit/28386cb567760c2c9f4c253419be118685fec921))
* **ci:** use PAT for release-please to trigger CI on release PRs ([#15](https://github.com/Elnora-AI/elnora-cli/issues/15)) ([256bd56](https://github.com/Elnora-AI/elnora-cli/commit/256bd56d03890861c0617e84a54e49869849f339))
* **docs:** clean up README — remove API key format, fix plugin section ([#5](https://github.com/Elnora-AI/elnora-cli/issues/5)) ([561ad61](https://github.com/Elnora-AI/elnora-cli/commit/561ad6130787fe1c9533a7bef54e7a280a85acec))
* update docs for client-readiness fixes ([06305ba](https://github.com/Elnora-AI/elnora-cli/commit/06305ba2431c37d8e401f02c8ab3f535fec1e92d))


### Documentation

* add Claude Code plugin section to README ([#4](https://github.com/Elnora-AI/elnora-cli/issues/4)) ([ed68aba](https://github.com/Elnora-AI/elnora-cli/commit/ed68abaf9b6e11bd19d0a4582376c8b65ea63658))

## [Unreleased]

### Added

- `elnora health` command — check platform availability (no auth required)

## [0.1.0] - 2026-03-04

### Added

- Initial release of Elnora CLI
- 6 command groups: `auth`, `projects`, `tasks`, `files`, `search`, `completion`
- Projects: list, get, create
- Tasks: list, get, create, send message, get messages, update, archive
- Files: list, get, content, versions
- Search: tasks, files
- Global options: `--compact`, `--output json|csv`, `--fields`
- Shell completions for bash, zsh, and fish
- Structured JSON/CSV output with machine-readable error codes
- Interactive `auth login` command with guided setup and `auth logout`
- API key resolution: env var, `.env` file, or `~/.elnora/config.toml`
- Credential scrubbing in all error output
- SSRF protection and redirect blocking
- Request throttling (100ms minimum between requests)

[Unreleased]: https://github.com/Elnora-AI/elnora-cli/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Elnora-AI/elnora-cli/releases/tag/v0.1.0
