# Contributing to OmniWorkspace

Thank you for your interest in contributing to OmniWorkspace!

## Code of Conduct
We are committed to providing a friendly, safe, and welcoming environment for all contributors. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Workflow
1. Fork the repository on GitHub.
2. Clone your fork locally.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a descriptive feature branch:
   ```bash
   git checkout -b feat/my-new-capability
   ```
5. Implement your changes following clean architecture principles:
   - Ensure tools declare strict JSON schemas and appropriate `PermissionLevel`.
   - Never log or store raw API keys.
   - External inputs must be treated as untrusted data.
6. Run the test suite:
   ```bash
   npm test
   ```
7. Verify production build:
   ```bash
   npm run build
   ```
8. Commit and submit a Pull Request using our [PR Template](.github/PULL_REQUEST_TEMPLATE.md).
