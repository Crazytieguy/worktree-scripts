# worktree-scripts

Bash scripts for managing git worktrees.

## Scripts

### `spawn-worktree [branch-name]`

Creates a new git worktree.

- If no branch name provided, generates a random one (e.g., `swift-fox-42`)
- Creates worktree at `~/worktrees/<project>/<branch>`
- Copies all gitignored files
- Prints the worktree path to stdout

### `land-worktree [--abort]`

Cleans up the current worktree and integrates changes into main.

- Rebases branch onto main
- Fast-forwards main to include the commits
- Removes the worktree and deletes the branch
- Use `--abort` to abort a conflicted rebase
