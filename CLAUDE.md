# worktree-scripts

CLI tools for git worktree management with Claude Code.

## Commands

```bash
bun run lint         # Check with Biome
bun run lint:fix     # Auto-fix lint issues
bun run typecheck    # TypeScript type checking
bun run install-global  # Copy to ~/.local/bin/
```

## Architecture

- `src/spawn-worktree.ts` - Creates worktrees, copies gitignored files, prints path to stdout
- `src/land-worktree.ts` - Rebases and removes worktrees

Both scripts are standalone CLI tools that run directly with Bun.
