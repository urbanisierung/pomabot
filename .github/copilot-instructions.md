# ReactSlides Monorepo

A modern presentation library built with React, TypeScript, and pnpm workspaces.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run tests, linting, type checking, and build (required before commits)
pnpm verify

# Development
pnpm dev --filter <package-name>

# Format code
pnpm format
```

## Project Structure

```
monorepo/
├── packages/
│   ├── reactslides/         # Core presentation library
│   ├── shared-ui/           # Reusable UI components
│   └── mcp-server/          # MCP server for AI integration
├── apps/
│   ├── web/                 # Web application (MobX + i18n)
│   ├── landing/             # Documentation site
│   ├── cli/                 # CLI tools and templates
│   └── example/             # Example presentations
└── .github/instructions/    # Domain-specific instructions
```

## Development Workflow

### Making Changes

1. **Make your changes** in the appropriate package
2. **Format code**: `pnpm format` (uses Biome.js)
3. **Verify all checks pass**: `pnpm verify`
4. **Commit and push** your changes

### Testing

```bash
# Run all tests
pnpm test

# Test specific package
pnpm test --filter <package-name>

# Focus on one test
pnpm vitest run -t "<test name>"
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
pnpm build --filter <package-name>
```

## Key Conventions

### Code Style

- **Linting & Formatting**: Biome.js (replaces ESLint + Prettier)
- **TypeScript**: Strict mode, prefer `const` and functions over classes
- **React**: Functional components with hooks (React 19+)
- **Styling**: Tailwind CSS v4 with utility classes
- **Never use `null`**: Use `undefined` for optional values

### Imports Organization

```typescript
// 1. External dependencies
import React from "react";
import { useState } from "react";

// 2. Internal packages
import { Slide } from "@reactslides/shared-ui";

// 3. Relative imports
import { MyComponent } from "./components/MyComponent";
```

### Dependencies

- Always use **exact versions** (no `^` or `~`)
- Check latest version: `npm view <package> version`
- Add with exact version: `pnpm add <package>@<version>`

### Monorepo Commands

```bash
# Add dependency to specific package
pnpm add <package> --filter <package-name>

# Run command in all packages
pnpm -r <command>

# Find package location
pnpm dlx turbo run where <package-name>
```

## Domain-Specific Guidelines

Detailed instructions for specific areas are in `.github/instructions/`:

- **Web App** (`web-i18n.instructions.md`): Custom MobX-based i18n system
- **Shared UI** (`ui.instructions.md`): i18n-agnostic component design
- **Templates** (`template-creation.instructions.md`): Creating CLI templates
- **Import/Export** (`import-export.instructions.md`): PowerPoint/Google Slides
- **MCP Server** (`mcp-server.instructions.md`): AI integration updates
- **Markdown Mode** (`markdown-mode.instructions.md`): Dual-mode support

## Internationalization (Web App)

The web app uses a custom MobX-based i18n system:

```typescript
import { observer } from "mobx-react-lite";
import { useI18nStore } from "../stores/StoreContext";

export const MyComponent = observer(() => {
  const i18nStore = useI18nStore();
  
  return (
    <h1>{i18nStore.t("title")}</h1>
    <p>{i18nStore.tf("greeting", { name: userName })}</p>
  );
});
```

**Rules for shared-ui components**: No i18n dependencies. Accept text as props.

## Pre-Commit Checklist

Before finishing any PR, ensure:

```bash
# This command MUST succeed:
pnpm verify
```

This runs in order:
1. **Lint** - Code quality checks (Biome)
2. **Check** - Type checking (TypeScript)
3. **Test** - All tests pass (Vitest)
4. **Build** - Production build succeeds

## Common Tasks

### Adding a New Feature

1. **Update core library** (`packages/reactslides/`)
2. **Update shared-ui** if needed (`packages/shared-ui/`)
3. **Update MCP server** (`packages/mcp-server/`)
4. **Update example app** (`apps/example/`)
5. **Update landing docs** (`apps/landing/`)
6. **Support both React and Markdown modes**
7. **Run `pnpm verify`**

### Adding a New Component

```typescript
// Always export types
export interface MyComponentProps {
  /** Description of prop */
  title: string;
  className?: string;
}

// Use Tailwind for styling
export function MyComponent({ title, className }: MyComponentProps) {
  return (
    <div className={cn("default-styles", className)}>
      {title}
    </div>
  );
}
```

### Creating a Template

1. Create in `apps/cli/templates/<name>/`
2. Use config-based customization (colors, fonts, logos)
3. Implement standard layouts (title, section, content slides)
4. Test with `pnpm build --filter <template-name>`
5. Update template list in CLI

## Debugging

### Common Issues

- **"workspace not found"**: Check `pnpm-workspace.yaml`
- **Type errors after changes**: Run `pnpm check`
- **Format issues**: Run `pnpm format`
- **Build failures**: Check dependency versions are exact

### Useful Commands

```bash
# Check for outdated packages
pnpm outdated --recursive

# Clear build artifacts
pnpm clean

# View turbo cache
turbo info
```

## CI/CD

The CI workflow runs:
1. `pnpm lint`
2. `pnpm check`
3. `pnpm build`
4. `pnpm test`

Match this locally with: **`pnpm verify`**

## Need Help?

- Check domain-specific instructions in `.github/instructions/`
- Review existing tests for patterns
- Ask questions if requirements are unclear
- Always format code before committing: `pnpm format`
