# Changelog

All notable changes to the Elnora CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

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
