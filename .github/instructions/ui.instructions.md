---
applyTo: "**"
---

# shadcn LLM UI Development Instructions (2025)

_Last updated: August 2025_

- Always use the fetch tool to look up the latest component usage, install name, and best practices directly from the official shadcn documentation: https://ui.shadcn.com/docs
- Do not rely on what you think you know about shadcn components, as they are frequently updated and improved. Your training data is outdated.
- For any shadcn component, CLI command, or usage pattern, fetch the relevant page from the docs and follow the instructions there.

**Core Principles:**

- shadcn components are open code: you are expected to read, modify, and extend them directly.
- Follow accessibility and composition best practices as described in the docs.

**Summary:**

> For all shadcn work, always use the fetch tool to look up the latest component documentation and usage from https://ui.shadcn.com/docs. Do not rely on static instructions.

## Internationalization (i18n) for shared-ui Components

The `shared-ui` package is designed to be **i18n-agnostic**. Components in this package do not implement their own translation logic or depend on any specific i18n library.

### Design Principles

1. **Prop-Based Text**: All user-facing text is passed as props (e.g., `title`, `subtitle`, `label`, `description`)
2. **No Translation Dependencies**: shared-ui has no dependencies on MobX, i18next, or any translation library
3. **Consumer Responsibility**: Applications using shared-ui are responsible for translating text before passing it to components
4. **Default to English**: Components may have English defaults for optional text, but consumers should override these

### Usage Pattern

When using shared-ui components in an i18n-enabled application:

```typescript
import { PageHeader } from "@getdevpulse/shared-ui"
import { useI18nStore } from "../stores/StoreContext"

function MyPage() {
  const i18nStore = useI18nStore()

  return (
    <PageHeader
      title={i18nStore.t("myPageTitle")}
      subtitle={i18nStore.t("myPageSubtitle")}
      selectPlaceholder={i18nStore.t("selectPlaceholder")}
    />
  )
}
```

### Component Guidelines

When creating or modifying shared-ui components:

- ✅ **DO** accept text as string props
- ✅ **DO** provide clear prop names (title, label, description, etc.)
- ✅ **DO** document that text props should be pre-translated
- ❌ **DON'T** import or depend on translation libraries
- ❌ **DON'T** implement translation logic within components
- ❌ **DON'T** hardcode English strings for user-facing text (except in examples/stories)

### Examples

**Good - Text as Props:**

```typescript
interface MetricsCardProps {
  title: string;
  description?: string;
  value: number | string;
}
```

**Bad - Hardcoded English:**

```typescript
// ❌ Don't do this
function MetricsCard({ value }: { value: number }) {
  return (
    <Card>
      <h3>Performance Score</h3>  {/* Hardcoded! */}
      <p>{value}</p>
    </Card>
  )
}
```

**Good - Consumer Translates:**

```typescript
// ✅ Do this
<MetricsCard
  title={i18nStore.t("performanceScore")}
  value={performanceValue}
/>
```

### Future Considerations

If shared-ui needs to display internal text (error messages, loading states, etc.), consider:

1. Accept optional translation callback as prop
2. Provide default English with clear documentation
3. Keep components flexible for different i18n strategies

**Note:** The LanguageSelector component in UIShell is an exception - it manages language state but receives language options as props from the consumer.
