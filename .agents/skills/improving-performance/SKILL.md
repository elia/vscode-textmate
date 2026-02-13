---
name: improving-performance
description: Process for systematically finding and fixing performance bottlenecks in code. Use when asked to improve performance, speed up code, or investigate slowness — covers analysis, prioritization, incremental delivery via PRD loop.
---

# Improving Performance

A systematic process for identifying and fixing performance bottlenecks, delivered as incremental commits.

## Process

### 1. Analyze the Hot Path

Read the full code and trace the critical path end-to-end. Identify what runs on every user action (keystroke, scroll, click). Write findings as comments at the top of the main file:

```
// BOTTLENECK 1: [description] — [impact] — Fix: [approach]
// BOTTLENECK 2: ...
// PRIORITY ORDER: list by biggest impact first
```

This serves as both documentation and a working checklist.

### 2. Write a PRD

Create `doc/specs/<feature>-performance.md` with checkbox tasks grouped by category:

- **Hot loop optimizations** — algorithmic improvements in the innermost loops
- **Rendering optimizations** — reduce DOM work, skip unnecessary operations
- **Structural changes** — virtual scrolling, caching, architecture shifts

Order categories from easiest/safest to most impactful/risky.

### 3. Execute via Ralph Loop

One commit per category using fresh subagent sessions. Each iteration:

1. Launch subagent with specific tasks and coding style rules
2. Verify changes (lint, read key sections)
3. Commit with descriptive message
4. Update PRD checkboxes and progress log

### 4. Archive

Move completed PRD to `doc/specs/completed/`, remove progress file.

## Common Bottleneck Patterns

### Allocation in hot loops

Creating arrays/objects per iteration causes GC pressure. Fix: pre-allocate and reuse.

```js
// Bad: fresh array per call, called 10k times
let matrix = Array(n)
  .fill()
  .map(() => Array(m).fill(0))

// Good: module-level typed array, grown as needed
let _matrix = new Float64Array(maxN * maxM)
```

### Repeated string operations

`toLowerCase()`, `trim()`, regex in inner loops. Fix: pre-compute once, pass through.

```js
// Bad: lowercased per-character per-item per-keystroke
if (needle[i].toLowerCase() === hay[j].toLowerCase())

// Good: pre-lowercase at init, compare directly
item._lower = item.label.toLowerCase()  // once
if (needle[i] === hayLower[j])           // hot loop
```

### Full DOM rebuild

`replaceChildren()` with all elements when only a slice is visible. Fix: virtual scrolling.

### Unnecessary work

Sorting when all scores are equal, scanning full list when filter only grew. Fix: conditional skip, incremental narrowing.

### Regex in tight loops

`/pattern/.test(ch)` per character. Fix: charCode comparisons.

```js
// Bad
static isAlnum(ch) { return /[a-zA-Z0-9]/.test(ch) }

// Good
static isAlnum(ch) {
  let c = ch.charCodeAt(0)
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)
}
```

## Subagent Prompt Template

When delegating to a subagent, include:

1. **File to edit** — absolute path
2. **Tasks** — numbered list with before/after code snippets
3. **Coding style rules** — project conventions (indent, quotes, semicolons, `let` vs `const`)
4. **Explicit instruction** to make ALL changes and return a summary

Keep task descriptions concrete with code examples, not abstract descriptions.
