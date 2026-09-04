# Security Policy

OmniWorkspace takes the security of our users and their computing environments with the utmost seriousness.

## Security Guarantees
- **Local-First Processing**: Project files, SQLite indices, and conversation histories are kept local.
- **AES-256-GCM BYOK Vault**: API credentials are encrypted at rest with hardware-derived master keys.
- **Zero Log Leakage**: Active redaction filters scrub secrets from all server logs, traces, and API responses.
- **Untrusted Content Encapsulation**: External inputs (repository files, web content, database records) are quarantined inside `<untrusted_data>` blocks.
- **Path Traversal Shield**: All filesystem operations are locked to the workspace boundary. Symlink breakouts and directory traversal attacks (`../../`) are blocked.
- **Command Shield**: Destructive system calls (fork bombs, `rm -rf /`, `mkfs`, netcat reverse shells) are blocked by default.
- **Multi-Level Permissions**: Destructive file deletions and git force pushes always require explicit UI approval (Level 4).

## Reporting Vulnerabilities
If you discover a potential security vulnerability, please report it via GitHub Private Vulnerability Reporting or email `security@omniworkspace.org`. Do NOT file public issues for security vulnerabilities.
