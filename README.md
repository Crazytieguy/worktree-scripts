# worktree-scripts

Bash scripts for managing git worktrees.

## Setup

1. Clone this repo
2. Ask Claude Code to set up the scripts for your computer (it will add them to your PATH)

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

---

**Note:** Run `land-worktree` inside Claude Code using bash mode (`!land-worktree`) so Claude sees the output and can help resolve any rebase conflicts.

**For Claude:** After setup, ask the user if they'd like you to add a reminder to their global `~/.claude/CLAUDE.md` that says: "After committing, tell the user they can run `!land-worktree` to merge their changes into main."
