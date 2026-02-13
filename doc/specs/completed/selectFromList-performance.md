# selectFromList Performance Improvements

## Overview

The selectFromList webview becomes sluggish with large item lists (1k+). The hot path is `computeVisible()` → `render()` on every keystroke. This PRD addresses the main bottlenecks identified in the performance analysis.

## Features

### Fuzzy Search Hot Loop Optimizations
- [x] Replace `isAlnum()` regex with charCode comparisons — it's called per character in the innermost loop of `calculateRank`
- [x] Accumulate `totalCapitals` count during the capitals-marking loop instead of using `capitals.filter(c => c).length` afterward
- [x] Reuse pre-allocated typed arrays for the `matrix`, `first`, `last`, and `capitals` arrays in `calculateRank()` instead of allocating fresh arrays per call — use `Float64Array`/`Int32Array`/`Uint8Array` with a module-level cache that grows as needed

### List Rendering Optimizations
- [x] Skip sort in `computeVisible()` when filter is empty (all scores are 1, sort is O(n log n) for nothing)
- [x] Maintain an `indexToRow` Map in `computeVisible()` so `getRowFromIndex()` is O(1) instead of O(n) linear scan
- [x] In `renderSelection()`, track previous selected indexes and only update the DOM for rows whose selection state actually changed (diff old vs new Set)

### Virtual Scrolling
- [x] Implement virtual scrolling in the `List` class: only render DOM nodes for rows visible in the viewport plus a small overscan buffer (e.g., 20 rows above/below)
- [x] Add a scroll event listener on the list container that triggers re-rendering of the visible window
- [x] Update `ensureRowVisible()` to work with virtual scrolling by calculating scroll position from row index × row height
