---
description: "React 19+ development standards"
applyTo: "**/*.jsx, **/*.tsx"
---

# React Development Standards

Modern React patterns with hooks, TypeScript, and React 19+ features.

## Component Design

- **Always use functional components** with hooks
- **TypeScript interfaces** for all props and state
- **Component composition** over inheritance
- **Single responsibility** - one concern per component
- **Testable and reusable** design

## Key Patterns

### Hooks
- `useState` for local state
- `useReducer` for complex state logic
- `useContext` for shared state
- `useEffect` with proper dependencies and cleanup
- `useMemo`/`useCallback` for performance (when needed)
- Custom hooks for reusable logic

### State Management
- Local state for component-specific data
- Context for tree-wide state
- MobX (in web app) for global reactive state
- React Query/SWR for server state

### Error Handling
- Error Boundaries for component errors
- Proper loading/error/success states
- Meaningful error messages

### Accessibility
- Semantic HTML elements
- ARIA attributes where needed
- Keyboard navigation support
- Color contrast compliance
- Screen reader compatibility

## React 19+ Features

- Use new hooks and features as appropriate
- Follow latest React documentation patterns
- Leverage concurrent features when beneficial

## Testing

- Use React Testing Library
- Test behavior, not implementation
- Mock external dependencies appropriately
