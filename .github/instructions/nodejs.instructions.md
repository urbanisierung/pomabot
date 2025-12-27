---
description: "NodeJS development standards"
applyTo: "**/*.js, **/*.ts"
---

# Node.js Standards

## Code Style

- TypeScript with ES2022 features and Node.js 22+ ESM modules
- Prefer Node.js built-in modules over external dependencies
- Always use async/await (promisify callbacks with `node:util`)
- Never use `null`, use `undefined` for optional values
- Prefer functions over classes
- Code should be self-documenting (avoid unnecessary comments)
