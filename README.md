# worktree-scripts

CLI tools for managing git worktrees when using Claude Code.

## Scripts

### `new-worktree [branch-name] [-- claude-flags...]`

Creates a new git worktree and launches Claude in it.

- If no branch name provided, generates a random one (e.g., `swift-fox-42`)
- Creates worktree at `~/worktrees/<project>/<branch>`
- Copies all gitignored files
- Launches Claude with any additional flags passed after `--`

### `cleanup-worktree [--abort]`

Cleans up the current worktree and integrates changes into main.

- Rebases branch onto main
- Fast-forwards main to include the commits
- Removes the worktree and deletes the branch
- Use `--abort` to abort a conflicted rebase

## Installation

```bash
bun run install-global
```

Copies `new-worktree` and `cleanup-worktree` to `~/.local/bin/`.
