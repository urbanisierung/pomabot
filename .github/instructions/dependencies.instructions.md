---
description: "Dependency management policy"
applyTo: "**/package.json"
---

# Dependency Management

## Version Policy

**Always use exact versions** (no `^`, `~`, `>=`):

```json
// ✅ Good
"react": "19.2.0"

// ❌ Bad
"react": "^19.2.0"
```

## Adding Dependencies

1. Check latest version: `npm view <package> version`
2. Add with exact version: `pnpm add <package>@<version>`
3. For dev deps: `pnpm add -D <package>@<version>`
4. To specific package: `pnpm add <package>@<version> --filter <package-name>`

## Updating Dependencies

```bash
# Check outdated
pnpm outdated --recursive

# Update specific package
pnpm update <package> --latest

# Security check
pnpm audit
```

## Core Dependencies

Keep these updated to latest stable:
- React 19+
- TypeScript 5.9+
- Vite 7+
- Vitest (latest)
- Biome (latest)
- Turbo (latest)
