# Contributing to SocialForex

Thanks for helping! Bug reports, feature ideas and pull requests are all welcome.

## Development setup

Follow [Getting started](README.md#getting-started) in the README. You need Node.js 20+ and Docker for PostgreSQL.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep changes focused — one feature or fix per PR.
3. Add translation keys to **both** `messages/vi.json` and `messages/en.json`.
4. New pages under `src/app/[locale]/` are added to navigation only via `src/components/layout/nav-config.ts`.
5. Mutations go through server actions in `src/actions/` (auth → rate limit → Zod validation → Prisma → revalidate).
6. Run before pushing:
   ```bash
   npm run lint
   npm test
   npm run build
   ```
7. Use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages, e.g. `feat(journal): add R-multiple histogram`.

## Reporting bugs

Open an issue with steps to reproduce, what you expected and what happened. Screenshots help.

## License

By contributing you agree that your contributions are licensed under the [AGPL-3.0](LICENSE).
