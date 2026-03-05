# Changelog

All notable changes to the Elnora CLI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
