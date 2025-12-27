---
description: "Biome.js linting and formatting"
applyTo: "**/*.ts, **/*.tsx, **/*.js, **/*.jsx, **/*.json"
---

# Biome.js Standards

Biome.js replaces ESLint + Prettier with a single, fast tool.

## Commands

```bash
pnpm format    # Format files
pnpm lint      # Lint files
pnpm check     # Type checking
```

## Key Rules

- No `var`, use `const` or `let`
- No non-null assertions (`!`) without good reason
- Remove unused variables and imports
- Include keys in list items
- Include all dependencies in `useEffect` arrays

## Import Order

Biome auto-organizes imports:

1. External dependencies (react, etc.)
2. Internal packages (@reactslides/*)
3. Relative imports (./components)

## Formatting

- 2 spaces indentation
- 100 character line width
- Double quotes
- Semicolons always

## IDE Setup (VS Code)

```json
{
  "editor.defaultFormatter": "biomejs.biome",
  "editor.formatOnSave": true
}
```

## Ignoring Rules

```typescript
// biome-ignore lint/rule-name: Reason
const value = data!.value;
```
