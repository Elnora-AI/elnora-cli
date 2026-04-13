## Summary

<!-- What does this PR do? 1-3 bullet points. -->

## PR Title Convention

> **Important:** PR titles must use [Conventional Commits](https://www.conventionalcommits.org/) format.
> Release Please parses the **squash-merge commit message** (which defaults to the PR title)
> to determine version bumps and changelog entries. A PR merged without a conventional
> prefix will not trigger a release.

| Prefix | Version bump | Example |
|--------|-------------|---------|
| `fix:` | Patch (1.0.x) | `fix: correct stream token exchange timeout` |
| `feat:` | Minor (1.x.0) | `feat: add batch file upload command` |
| `feat!:` or `BREAKING CHANGE:` | Major (x.0.0) | `feat!: remove deprecated Python commands` |
| `chore:` | No release | `chore: update dev dependencies` |
| `docs:` | No release | `docs: fix skill typos` |
| `style:` | No release | `style: fix lint warnings` |
| `refactor:` | No release | `refactor: extract polling into shared helper` |
| `test:` | No release | `test: add stream renderer edge cases` |

Optional scope: `fix(stream): ...`, `feat(tasks): ...`

## Testing

- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] Tested locally with `node dist/cli.js`

## Linear Issue

<!-- Link the Linear issue if applicable: ELN-XXX -->
