# ADR-006 — OAuth-Only Authentication (GitHub + GitLab), No Passwords

**Status:** Accepted
**Date:** 2026-05-01

## Context

SentinelOps is a developer tool used by engineering teams. Every engineer on the team already has a GitHub or GitLab account. Implementing email/password auth adds complexity (password hashing, reset flows, brute-force protection) with no benefit for this audience.

## Decision

Support only OAuth 2.0 login via GitHub and GitLab. No email/password, no magic links, no other providers. JWTs are issued after successful OAuth and used for all subsequent API calls.

## Consequences

- Zero password storage or management
- Users authenticate with credentials they already trust and manage
- Account recovery is handled entirely by the OAuth provider
- Users without a GitHub or GitLab account cannot use SentinelOps — acceptable given the target audience
- Adding more providers (Bitbucket, Google) in the future is straightforward via the Passport.js strategy pattern
