# Security Policy

## Supported Versions

This project is pre-release and does not yet have a supported package version.
Security fixes are made on the default branch until a release policy is
published.

## Reporting a Vulnerability

Do not report security vulnerabilities in a public issue.

Use [GitHub private vulnerability reporting](https://github.com/dills122/formly-contract/security/advisories/new)
to share the affected version or commit, impact, reproduction details, and any
suggested mitigation. Remove secrets, customer data, and workplace code from
all examples.

The project will acknowledge a report as soon as practical, validate its scope,
and coordinate disclosure after a fix or mitigation is available. As a new
volunteer project, it does not yet promise a fixed response-time SLA.

## Security Boundaries

- Registered form compilation must use synthetic or explicitly approved data.
- Routine MCP queries must never execute application or expression code.
- Contract artifacts must not contain secrets, customer values, credentials,
  live Angular objects, or unrestricted remote option data.
- Unsupported dynamic behavior must be reported as unknown rather than
  evaluated or guessed.
