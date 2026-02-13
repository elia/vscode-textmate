---
name: refactoring-select-from-list
description: Domain knowledge for the selectFromList webview component in vscode-textmate. Use when modifying, debugging, or extending the fuzzy-search selector UI — covers architecture, data flow, key files, and known constraints.
---

# selectFromList Architecture

A webview-based fuzzy-search selector that replaces VS Code's native QuickPick for richer interaction (multi-select, range select, alternate actions).

## Key Files

| File                            | Role                                                                                                     |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/selectFromList.js`         | Extension-side provider — creates/reuses webview, posts items, resolves promises                         |
| `src/selectFromList/main.js`    | Webview-side — `List` class (virtual scrolling, selection), `FuzzySearch` class (TextMate-style ranking) |
| `src/selectFromList/index.html` | HTML shell with inline CSS, search input, CSP nonces                                                     |
| `src/selectFromList.json`       | Manifest fragment (contributes views, commands, configuration)                                           |

## Data Flow

```
Command invokes showSelectFromList(items, options)
  → chooseItems() on provider
    → createWebviewPanel() (reuses if alive) or sidebar path
    → reveal() panel (so it's visible before init)
    → await _isReady (resolves when webview posts "ready")
    → postMessage({ type: "init", items, requestId })
  → webview receives init
    → pre-lowercases labels (_lowerLabel, _lowerDescription)
    → computeVisible() → render() (virtual scrolling)
    → focus search input
  → user types → 30ms debounce → computeVisible() → render()
  → user submits (Enter / double-click)
    → postMessage({ type: "submit", indexes, requestId })
  → provider resolves promise with selected items
```

## FuzzySearch (TextMate port)

- `rank(filter, candidate, candidateLower, out)` — entry point, filter is already lowercase
- `calculateRank(lhs, rhs, rhsLower, out)` — matrix-based scoring from TextMate's `ranker.cc`
- `rankFile(filter, filename, directory, filenameLower, directoryLower)` — tries filename first, falls back to full path
- `isSubset(needle, haystackLower)` — fast pre-check before full ranking
- Pre-allocated typed arrays (`_matrix`, `_first`, `_last`, `_capitals`) avoid GC pressure

## Performance Characteristics

- **Virtual scrolling** — only ~60 DOM nodes regardless of list size (20-row overscan)
- **Incremental filtering** — typing more chars narrows from previous matches, not full list
- **Pre-lowercased labels** — `toLowerCase()` called once at init, not per-char in hot loop
- **Panel reuse** — `retainContextWhenHidden: true`, panel is reused across opens

## Constraints

- The `FuzzySearch.calculateRank` algorithm is a TextMate port — modify with extreme care
- `requestId` prevents stale responses from previous invocations
- `close()` disposes panel (panel path) or hides sidebar — different teardown per render mode
- The `_isReady` promise pattern: created fresh when panel/sidebar is new, stays resolved when reusing
