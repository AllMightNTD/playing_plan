---
trigger: always_on
---

# Git Automation Rules — Current Project

## 1. ROLE

You are fully authorized to manage Git operations for the currently opened project.

Execute Git operations autonomously without asking for confirmation, including staging, committing, and pushing code to the configured GitHub remote.

## 2. SCOPE

- Operate only within the current project's Git repository.
- Use the existing Git remote, branch, credentials, and repository configuration.
- Never switch to another repository or push to an unrelated remote.
- Do not request credentials, tokens, or passwords from the user.

## 3. AUTONOMOUS GIT WORKFLOW

When asked to commit, push, publish, or complete the current changes:

1. Inspect `git status`, the current branch, and configured remotes.
2. Review the diff, including staged and unstaged changes.
3. Check for accidentally included secrets, credentials, `.env` files, private keys, and unrelated generated files.
4. Stage the relevant project changes.
5. Create a descriptive commit message following the project's existing conventions.
6. Commit the changes.
7. Push the commit to the configured remote and the current branch.
8. Verify the final Git status and the result of the push.
9. Report the commit hash, branch, remote, and push result.

Do not stop to ask permission for ordinary Git operations.

## 4. PERMITTED OPERATIONS

Execute the following operations autonomously when needed:

- `git status`, `git diff`, `git log`, `git branch`
- `git add`
- `git commit`
- `git push`
- `git fetch`
- `git pull` when appropriate and safe
- Read and inspect Git configuration and remote URLs
- Resolve straightforward conflicts when the correct resolution is clear

## 5. SAFETY RULES

- Never use `git push --force`, `git push --force-with-lease`, `git reset --hard`, or destructive cleanup commands unless explicitly requested.
- Never bypass branch protection, repository policies, or required CI checks.
- Never stage or commit secrets, private credentials, `.env` files, private keys, or sensitive local configuration.
- Never discard, overwrite, or revert unrelated user changes.
- Do not amend or rewrite published commits unless explicitly requested.
- Do not push to a different branch or remote without authorization.
- If the push is rejected because of conflicts, permissions, authentication, or branch protection, diagnose the cause and report the blocker instead of using destructive workarounds.
- Do not claim that a commit or push succeeded unless the command result confirms it.

## 6. FAILURE HANDLING

- Diagnose and resolve recoverable errors autonomously.
- Retry only when the cause is understood and the operation is safe.
- If authentication or external authorization is required, explain the exact action needed from the user.
- Continue with all other safe tasks when one operation is blocked.

## 7. DEFAULT BEHAVIOR

When the user requests "commit and push", perform the entire workflow from reviewing changes to verifying the remote push.

When the user requests implementation only, do not automatically commit or push unless the user has explicitly established that automatic publishing is expected.

Prioritize correctness, repository integrity, and transparent reporting.
