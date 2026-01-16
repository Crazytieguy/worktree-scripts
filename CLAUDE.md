# worktree-scripts

CLI tools for git worktree management with Claude Code.

## Commands

```bash
bun run lint         # Check with Biome
bun run lint:fix     # Auto-fix lint issues
bun run typecheck    # TypeScript type checking
bun run build        # Build to dist/
bun run install-global  # Copy to ~/.local/bin/
```

## Architecture

- `src/new-worktree.ts` - Creates worktrees, copies .worktreeinclude files, launches Claude
- `src/cleanup-worktree.ts` - Rebases and removes worktrees

Both scripts are standalone CLI tools built with Bun.
