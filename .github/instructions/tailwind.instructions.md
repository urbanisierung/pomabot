---
description: "Tailwind CSS v4 standards"
applyTo: "**/*.tsx, **/*.css"
---

# Tailwind CSS v4

ReactSlides uses Tailwind CSS v4 for styling.

## Configuration

Tailwind v4 uses CSS-based configuration:

```css
/* src/index.css */
@import "tailwindcss";

@theme {
  --font-slide-heading: "Inter", system-ui, sans-serif;
  --color-slide-primary: oklch(60% 0.2 250);
}
```

## Vite Integration

```typescript
// vite.config.ts
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

## Slide Styling Patterns

```tsx
// Full-screen slide
<div className="aspect-slide w-full h-full bg-background">
  {children}
</div>

// Typography
<h1 className="text-7xl font-bold tracking-tight">Title</h1>
<p className="text-2xl leading-relaxed">Content</p>

// Two-column layout
<div className="grid grid-cols-2 gap-8 h-full">
  <div className="flex flex-col justify-center">{left}</div>
  <div className="flex flex-col justify-center">{right}</div>
</div>

// Animations
<div className="animate-fade-in delay-100">{content}</div>
```

## Class Merging

Use `cn()` helper for conditional classes:

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage
<div className={cn(
  "base-styles",
  variant === 'primary' && "bg-primary text-white",
  className
)} />
```

## Best Practices

- Use utility classes for styling
- Responsive design: `md:text-5xl lg:text-7xl`
- Support print: `@media print` for PDF export
- Accessibility: High contrast, focus states
