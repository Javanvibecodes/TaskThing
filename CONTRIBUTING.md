# Contributing to Task Thing

Thank you for considering contributing. Improvements to the application,
documentation, accessibility, testing, and developer experience are welcome.

## Ways to contribute

- Report reproducible bugs and regressions.
- Suggest features or improvements.
- Improve documentation and examples.
- Submit fixes, tests, UI improvements, and platform support.
- Review open pull requests and help verify changes.

## Before you start

1. Read the [README](README.md), [architecture guide](docs/ARCHITECTURE.md),
   and [build guide](docs/BUILD.md).
2. Search existing issues and pull requests to avoid duplicating work.
3. For substantial changes, open an issue or discussion first so the
   implementation can be aligned with the project's direction.
4. Never include credentials, pairing tokens, personal task data, signing
   keys, or other secrets in commits or issue reports.

## Development workflow

1. Fork the repository.
2. Create a focused branch from the current development branch when one is
   available; otherwise branch from the latest main.
3. Install dependencies using the documented Node.js and pnpm versions.
4. Keep changes scoped and follow the existing code style and architecture.
5. Add or update tests when practical, especially for data persistence,
   synchronization, validation, and security-sensitive behavior.
6. Run the relevant build and test commands before submitting.
7. Update documentation when behavior, setup, configuration, or security
   assumptions change.
8. Open a pull request describing the problem, solution, testing performed,
   and any compatibility or migration impact.

## Pull request expectations

- Explain why the change is needed and what it changes.
- Include steps to reproduce and verify bug fixes.
- Include screenshots or short recordings for meaningful UI changes.
- Call out changes to the local data format or sync protocol.
- Avoid unrelated formatting or refactoring in focused bug-fix PRs.
- Do not claim a platform or feature is tested unless it has been tested.
- Be respectful and constructive in review discussions.

## Security-sensitive changes

Security fixes should not expose vulnerabilities or credentials in public
issues. Follow [SECURITY.md](SECURITY.md) for responsible disclosure. Do not
weaken authentication, transport protections, input validation, or sandbox
settings without a clear threat analysis and tests.

## License of contributions

By submitting a contribution to this repository, you agree that your
contribution may be distributed under the repository's MIT License. You
retain copyright in your contribution. If you are unable to license your
contribution under these terms, do not submit it without discussing the
situation with the maintainers first.

## Code of conduct

Be welcoming, patient, and respectful. Harassment, discrimination,
intimidation, and personal attacks are not acceptable. Maintainers may
remove content or restrict participation when necessary to keep the project
constructive and safe.
