# worktree-scripts

CLI tools for managing git worktrees when using Claude Code.

## Scripts

### `new-worktree [branch-name] [-- claude-flags...]`

Creates a new git worktree and launches Claude in it.

- If no branch name provided, generates a random one (e.g., `swift-fox-42`)
- Creates worktree at `~/worktrees/<project>/<branch>`
- Copies files matching `.worktreeinclude` patterns (gitignored files only)
- Launches Claude with any additional flags passed after `--`

### `cleanup-worktree [--abort]`

Cleans up the current worktree and prepares the branch for merging.

- Rebases branch onto main
- Removes the worktree
- Switches back to main worktree
- Use `--abort` to abort a conflicted rebase

## Installation

```bash
bun install
bun run build
bun run install-global
```

Installs `new-worktree` and `cleanup-worktree` to `~/.local/bin/`.

## .worktreeinclude

Create a `.worktreeinclude` file in your project root to specify gitignored files that should be copied to new worktrees. Uses gitignore-style patterns.

Example:
```
.env
node_modules/
```
