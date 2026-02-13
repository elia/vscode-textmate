// REF: https://code.visualstudio.com/api/extension-guides/webview
/* global localStorage, acquireVsCodeApi, document, addEventListener, window, requestAnimationFrame */

class List {
  constructor() {
    this.items = []
    this.filterText = ""
    this.selectedIndexes = new Set()
    this.visibleItems = []
    this.currentRow = 0
    this.anchorIndex = 0
    this.listElement = null
    this._itemElements = {}
    this._renderedVisibleItems = ""
    this.limitFilteredResults = null
    this._indexToRow = new Map()
    this._previousSelectedIndexes = new Set()
    this._rowHeight = 0
    this._overscan = 20
    this._scrollTop = 0
    this._viewportHeight = 0
  }

  computeVisible() {
    this.visibleItems = []
    let filter = (this.filterText || "").trim().toLowerCase().split(":")[0]
    if (filter.startsWith("./")) filter = filter.substring(2)
    if (filter.length === 0) filter = null

    for (let index = 0; index < this.items.length; index++) {
      let item = this.items[index]
      if (!item.idx) item.idx = index

      if (!filter) {
        item.score = 1
        this.visibleItems.push(item)
      } else {
        item.score = FuzzySearch.rankFile(filter, item.label, item.description)
        if (item.score > 0) {
          this.visibleItems.push(item)
        }
      }
    }

    if (filter) {
      this.visibleItems = this.visibleItems.sort((a, b) => b.score - a.score)
    }

    this._indexToRow = new Map()
    for (let row = 0; row < this.visibleItems.length; row++) {
      this._indexToRow.set(this.visibleItems[row].idx, row)
    }

    if (this.currentRow >= this.visibleItems.length)
      this.currentRow = Math.max(0, this.visibleItems.length - 1)
    if (this.currentRow < 0) this.currentRow = 0
    if (this.selectedIndexes.size === 0 && this.visibleItems[0])
      this.selectedIndexes.add(this.visibleItems[0].idx || 0)

    // Reset anchor to current focused item if anchor is no longer visible
    if (
      this.getRowFromIndex(this.anchorIndex) < 0 &&
      this.visibleItems[this.currentRow]
    ) {
      this.anchorIndex = this.visibleItems[this.currentRow].idx
    }
  }

  renderElement(item) {
    const { idx: itemIndex, label, description } = item
    const listItem = document.createElement("li")
    listItem.className = "row"
    listItem.dataset.idx = String(itemIndex)
    listItem.setAttribute("role", "option")
    listItem.setAttribute(
      "aria-selected",
      this.selectedIndexes.has(itemIndex) ? "true" : "false",
    )

    let html = `<div class="item-label">${escapeHtml(label)}</div>`
    if (description)
      html += `<div class="item-description">${escapeHtml(description)}</div>`
    listItem.innerHTML = `<div class="item-content">${html}</div>`
    return listItem
  }

  renderSelectedItem(listItem, selected) {
    if (selected) {
      listItem.classList.add("selected")
      listItem.setAttribute("aria-selected", "true")
    } else {
      listItem.classList.remove("selected")
      listItem.setAttribute("aria-selected", "false")
    }
  }

  renderSelection() {
    let added = new Set()
    let removed = new Set()

    for (let idx of this.selectedIndexes) {
      if (!this._previousSelectedIndexes.has(idx)) {
        added.add(idx)
      }
    }

    for (let idx of this._previousSelectedIndexes) {
      if (!this.selectedIndexes.has(idx)) {
        removed.add(idx)
      }
    }

    for (let idx of added) {
      let listItem = this.listElement.querySelector(`li[data-idx="${idx}"]`)
      if (listItem) this.renderSelectedItem(listItem, true)
    }

    for (let idx of removed) {
      let listItem = this.listElement.querySelector(`li[data-idx="${idx}"]`)
      if (listItem) this.renderSelectedItem(listItem, false)
    }

    this._previousSelectedIndexes = new Set(this.selectedIndexes)
  }

  measureRowHeight() {
    if (this._rowHeight > 0 || this.visibleItems.length === 0) return
    let sample = this.renderElement(this.visibleItems[0])
    this.listElement.appendChild(sample)
    this._rowHeight = sample.getBoundingClientRect().height || 30
    this.listElement.removeChild(sample)
  }

  render() {
    this.measureRowHeight()

    if (this._rowHeight === 0) {
      this.listElement.replaceChildren()
      return
    }

    let totalHeight = this.visibleItems.length * this._rowHeight
    let startRow = Math.max(0, Math.floor(this._scrollTop / this._rowHeight) - this._overscan)
    let endRow = Math.min(
      this.visibleItems.length,
      Math.ceil((this._scrollTop + this._viewportHeight) / this._rowHeight) + this._overscan
    )

    let elements = []
    for (let row = startRow; row < endRow; row++) {
      let item = this.visibleItems[row]
      let listItem =
        this._itemElements[item.idx] ||
        (this._itemElements[item.idx] = this.renderElement(item))

      listItem.dataset.row = String(row)
      elements.push(listItem)
    }

    this.listElement.style.height = totalHeight + "px"
    this.listElement.style.paddingTop = (startRow * this._rowHeight) + "px"
    this.listElement.style.boxSizing = "border-box"

    this.listElement.replaceChildren(...elements)
    this._previousSelectedIndexes = new Set()
    if (this.visibleItems.length > 0) {
      this.renderSelection()
      this.ensureRowVisible(this.currentRow)
    }
  }

  getIndexFromRow(row) {
    const visibleItem = this.visibleItems[row]
    return visibleItem ? visibleItem.idx : -1
  }

  getRowFromIndex(idx) {
    let row = this._indexToRow.get(idx)
    return row !== undefined ? row : -1
  }

  ensureRowVisible(row) {
    if (this._rowHeight <= 0) return
    let scrollContainer = this.listElement.closest("main") || this.listElement.parentElement
    if (!scrollContainer) return
    let rowTop = row * this._rowHeight
    let rowBottom = rowTop + this._rowHeight
    let viewTop = scrollContainer.scrollTop
    let viewBottom = viewTop + scrollContainer.clientHeight

    if (rowTop < viewTop) {
      scrollContainer.scrollTop = rowTop
    } else if (rowBottom > viewBottom) {
      scrollContainer.scrollTop = rowBottom - scrollContainer.clientHeight
    }
  }

  setFocusRow(row, shouldScroll = true) {
    if (this.visibleItems.length === 0) return
    row = Math.max(0, Math.min(row, this.visibleItems.length - 1))
    this.currentRow = row
    this.renderSelection()
    if (shouldScroll) this.ensureRowVisible(row)
  }

  selectOnlyRow(row) {
    const itemIndex = this.getIndexFromRow(row)
    this.selectedIndexes = new Set()
    if (itemIndex >= 0) this.selectedIndexes.add(itemIndex)
    this.anchorIndex = itemIndex
    this.setFocusRow(row, true)
  }

  rangeSelectToRow(row) {
    if (this.visibleItems.length === 0) return
    if (this.anchorIndex == null) this.anchorIndex = this.getIndexFromRow(0)
    const anchorRow = this.getRowFromIndex(this.anchorIndex)
    const start = Math.min(anchorRow, row)
    const end = Math.max(anchorRow, row)
    this.selectedIndexes = new Set()
    for (let rowIndex = start; rowIndex <= end; rowIndex++) {
      const itemIndex = this.getIndexFromRow(rowIndex)
      if (itemIndex >= 0) this.selectedIndexes.add(itemIndex)
    }
    this.setFocusRow(row, true)
  }

  toggleRow(row) {
    const itemIndex = this.getIndexFromRow(row)
    if (itemIndex < 0) return
    if (this.selectedIndexes.has(itemIndex)) {
      this.selectedIndexes.delete(itemIndex)
    } else {
      this.selectedIndexes.add(itemIndex)
    }
    this.anchorIndex = itemIndex
    this.setFocusRow(row, false)
    this.ensureRowVisible(row)
  }
}

// AI: Pre-allocated typed arrays for performance - reused across calculateRank calls
let _maxN = 64, _maxM = 256
let _matrix = new Float64Array(_maxN * _maxM)
let _first = new Int32Array(_maxN)
let _last = new Int32Array(_maxN)
let _capitals = new Uint8Array(_maxM)

function ensureCapacity(n, m) {
  if (n > _maxN || m > _maxM) {
    _maxN = Math.max(n, _maxN) * 2
    _maxM = Math.max(m, _maxM) * 2
    _matrix = new Float64Array(_maxN * _maxM)
    _first = new Int32Array(_maxN)
    _last = new Int32Array(_maxN)
    _capitals = new Uint8Array(_maxM)
  }
}

/**
 * TextMate-style Fuzzy Search Algorithm
 *
 * NOTE: This is a 1:1 port of TextMate's ranking algorithm from ranker.cc
 * DO NOT MODIFY without extreme care - this algorithm has been battle-tested
 * and any changes will break compatibility with TextMate's behavior.
 *
 * The current implementation is a simplified version for basic functionality.
 * The full algorithm includes complex matrix calculations for optimal scoring.
 */
class FuzzySearch {
  /**
   * Check if needle characters are a subset of haystack characters
   * @param {string} needle - The search string
   * @param {string} haystack - The candidate string
   * @returns {boolean}
   */
  static isSubset(needle, haystack) {
    let n = 0,
      m = 0
    while (n < needle.length && m < haystack.length) {
      if (
        needle[n].toLowerCase() === haystack[m].toLowerCase() ||
        needle[n] === haystack[m].toUpperCase()
      ) {
        n++
      }
      m++
    }
    return n === needle.length
  }

  /**
   * Normalize filter string by removing spaces and converting to lowercase
   * @param {string} filter
   * @returns {string}
   */
  static normalizeFilter(filter) {
    return filter.toLowerCase().replace(/\s/g, "")
  }

  /**
   * Check if character is uppercase
   * @param {string} ch
   * @returns {boolean}
   */
  static isUpper(ch) {
    return ch >= "A" && ch <= "Z"
  }

  /**
   * Check if character is alphanumeric
   * @param {string} ch
   * @returns {boolean}
   */
  static isAlnum(ch) {
    let code = ch.charCodeAt(0)
    return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)
  }

  /**
   * Calculate the fuzzy match rank between filter and candidate
   * @param {string} lhs - The filter string (needle)
   * @param {string} rhs - The candidate string (haystack)
   * @param {Array} out - Optional array to store match ranges
   * @returns {number} Score between 0-1, higher is better
   */
  static calculateRank(lhs, rhs, out = null) {
    let n = lhs.length
    let m = rhs.length

    // Initialize matrices and arrays using pre-allocated typed arrays
    ensureCapacity(n, m)
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < m; j++) _matrix[i * _maxM + j] = 0
      _first[i] = m
      _last[i] = 0
    }
    for (let j = 0; j < m; j++) _capitals[j] = 0

    // Mark capital letters and word boundaries
    let atBow = true // at beginning of word
    let totalCapitals = 0
    for (let j = 0; j < m; j++) {
      let ch = rhs[j]
      _capitals[j] = (atBow && this.isAlnum(ch)) || this.isUpper(ch)
      if (_capitals[j]) totalCapitals++
      atBow = !this.isAlnum(ch) && ch !== "'" && ch !== "."
    }

    // Fill the matrix with match lengths
    for (let i = 0; i < n; i++) {
      let j = i === 0 ? 0 : _first[i - 1] + 1
      for (; j < m; j++) {
        if (lhs[i].toLowerCase() === rhs[j].toLowerCase()) {
          _matrix[i * _maxM + j] = i === 0 || j === 0 ? 1 : _matrix[(i - 1) * _maxM + (j - 1)] + 1
          _first[i] = Math.min(j, _first[i])
          _last[i] = Math.max(j + 1, _last[i])
        }
      }
    }

    // Optimize search boundaries (backward pass)
    for (let i = n - 1; i > 0; i--) {
      let bound = _last[i] - 1
      if (bound < _last[i - 1]) {
        while (_first[i - 1] < bound && _matrix[(i - 1) * _maxM + (bound - 1)] === 0) {
          bound--
        }
        _last[i - 1] = bound
      }
    }

    // Propagate match lengths backward
    for (let i = n - 1; i > 0; i--) {
      for (let j = _first[i]; j < _last[i]; j++) {
        if (_matrix[i * _maxM + j] && _matrix[(i - 1) * _maxM + (j - 1)]) {
          _matrix[(i - 1) * _maxM + (j - 1)] = _matrix[i * _maxM + j]
        }
      }
    }

    // Propagate match lengths forward
    for (let i = 0; i < n; i++) {
      for (let j = _first[i]; j < _last[i]; j++) {
        if (_matrix[i * _maxM + j] > 1 && i + 1 < n && j + 1 < m) {
          _matrix[(i + 1) * _maxM + (j + 1)] = _matrix[i * _maxM + j] - 1
        }
      }
    }

    // Greedy walk of matrix to find best matches
    let capitalsTouched = 0
    let substrings = 0
    let prefixSize = 0

    let i = 0
    while (i < n) {
      let bestJIndex = 0
      let bestJLength = 0

      // Find best match position for current character
      for (let j = _first[i]; j < _last[i]; j++) {
        if (_matrix[i * _maxM + j] && _capitals[j]) {
          bestJIndex = j
          bestJLength = _matrix[i * _maxM + j]

          // Count capitals touched in this match
          for (let k = j; k < j + bestJLength; k++) {
            if (_capitals[k]) capitalsTouched++
          }
          break
        } else if (bestJLength < _matrix[i * _maxM + j]) {
          bestJIndex = j
          bestJLength = _matrix[i * _maxM + j]
        }
      }

      if (i === 0) {
        prefixSize = bestJIndex
      }

      let len = 0
      let foundCapital = false

      do {
        i++
        len++
        if (i === n) break

        _first[i] = Math.max(bestJIndex + len, _first[i])
        if (len < bestJLength && n < 4) {
          if (_capitals[_first[i]]) {
            continue
          }

          for (let j = _first[i]; j < _last[i] && !foundCapital; j++) {
            if (_matrix[i * _maxM + j] && _capitals[j]) {
              foundCapital = true
            }
          }
        }
      } while (len < bestJLength && !foundCapital)

      if (out) {
        out.push([bestJIndex, bestJIndex + len])
      }

      substrings++
    }

    // Calculate final score
    let score = 0.0
    const denom = n * (n + 1) + 1

    if (n === capitalsTouched) {
      score = (denom - 1) / denom
    } else {
      const subtract = substrings * n + (n - capitalsTouched)
      score = (denom - subtract) / denom
    }

    score += (m - prefixSize) / m / (2 * denom)
    // If there are no capitals, this term should be zero, not NaN
    if (totalCapitals > 0) {
      score += capitalsTouched / totalCapitals / (4 * denom)
    } else {
      score += 0
    }
    score += n / m / (8 * denom)

    return score
  }

  /**
   * Main ranking function - entry point for fuzzy matching
   * @param {string} filter - The search string
   * @param {string} candidate - The string to match against
   * @param {Array} out - Optional array to store match ranges
   * @returns {number} Score between 0-1, 0 means no match
   */
  static rank(filter, candidate, out = null) {
    if (!filter) {
      return 1
    }

    if (!this.isSubset(filter, candidate)) {
      return 0
    }

    if (filter === candidate) {
      if (out) {
        out.push([0, filter.length])
      }
      return 1
    }

    // For very large strings, use simple ratio
    if (filter.length * candidate.length > 8096) {
      return filter.length / candidate.length
    }

    return this.calculateRank(filter, candidate, out)
  }

  /**
   * Enhanced ranking function that mimics TextMate's file-aware behavior
   * @param {string} filter - The search string
   * @param {string} filename - The filename/basename to search
   * @param {string} directory - Optional directory path for fallback search
   * @param {boolean} isCurrent - Whether this is the currently active file
   * @param {Array} out - Optional array to store match ranges
   * @returns {number} Score between 0-1, 0 means no match
   */
  static rankFile(
    filter,
    filename,
    directory = null,
    isCurrent = false,
    out = null,
  ) {
    if (!filter) {
      return 1
    }

    // First try to match just the filename (higher priority)
    const fileMatches = []
    let rank = this.rank(filter, filename, fileMatches)

    if (rank > 0) {
      // Found a match in filename - boost the score
      rank += 1

      if (out && fileMatches.length > 0) {
        // Copy file matches to output
        out.push(...fileMatches)
      }
    } else if (directory) {
      // No filename match, try full path
      const fullPath = directory + "/" + filename
      const pathMatches = []
      rank = this.rank(filter, fullPath, pathMatches)

      if (rank > 0 && out && pathMatches.length > 0) {
        // Split matches between directory and filename parts
        const dirLength = directory.length
        for (const [start, end] of pathMatches) {
          if (start < dirLength) {
            // Match spans directory part
            out.push(["dir", start, Math.min(end, dirLength)])
          }
          if (end > dirLength + 1) {
            // Match spans filename part (skip the '/' separator)
            const fileStart = Math.max(start - dirLength - 1, 0)
            const fileEnd = end - dirLength - 1
            out.push(["file", fileStart, fileEnd])
          }
        }
      }
    }

    // Apply current file boost
    if (isCurrent && rank > 0) {
      rank += 0.1 // Small boost for current file
    }

    return rank
  }

  /**
   * Search and rank multiple candidates
   * @param {string} filter - The search string
   * @param {Array<string>} candidates - Array of strings to search
   * @param {number} limit - Maximum number of results (optional)
   * @returns {Array} Array of {item, score, matches} objects sorted by score
   */
  static search(filter, candidates, limit = null) {
    const normalizedFilter = this.normalizeFilter(filter)
    const results = []

    for (const candidate of candidates) {
      const matches = []
      const score = this.rank(normalizedFilter, candidate, matches)

      if (score > 0) {
        results.push({
          item: candidate,
          score: score,
          matches: matches,
        })
      }
    }

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score)

    return limit ? results.slice(0, limit) : results
  }

  /**
   * Highlight matches in a string using HTML
   * @param {string} text - The text to highlight
   * @param {Array} matches - Array of [start, end] match ranges
   * @param {string} className - CSS class for highlighted spans
   * @returns {string} HTML string with highlighted matches
   */
  static highlightMatches(text, matches, className = "fuzzy-match") {
    if (!matches || matches.length === 0) {
      return text
    }

    let result = ""
    let lastEnd = 0

    for (const [start, end] of matches) {
      // Add text before match
      result += text.slice(lastEnd, start)
      // Add highlighted match
      result += `<span class="${className}">${text.slice(start, end)}</span>`
      lastEnd = end
    }

    // Add remaining text
    result += text.slice(lastEnd)
    return result
  }

  static test() {
      const testCases = [
        { filter: "abc", candidate: "AlphaBetaCharlie", expected: true },
        { filter: "xyz", candidate: "AlphaBetaCharlie", expected: false },
        { filter: "doc", candidate: "DocumentController.mm", expected: true },
        { filter: "DC", candidate: "DocumentController", expected: true },
        // Dotfile tests
        { filter: "git", candidate: ".gitignore", expected: true },
        { filter: ".git", candidate: ".gitignore", expected: true },
        { filter: "ignore", candidate: ".gitignore", expected: true },
        { filter: "foo", candidate: ".gitignore", expected: false },
      ]

      console.log("Running fuzzy search tests...")
      testCases.forEach(({ filter, candidate, expected }, i) => {
        const score = this.rank(filter, candidate)
        const hasMatch = score > 0
        const status = hasMatch === expected ? "✓" : "✗"
        console.log(
          `${status} Test ${
            i + 1
          }: "${filter}" in "${candidate}" = ${score.toFixed(4)}`,
        )
      })

      // Search example
      const files = [
        "DocumentController.mm",
        "FileChooser.mm",
        "OakChooser.h",
        "ranker.cc",
        "TextMate.app",
        ".gitignore", // Added dotfile
      ]

      console.log('\nSearch results for "git":')
      const results = this.search("git", files)
      results.forEach(({ item, score }) => {
        console.log(`  ${item}: ${score.toFixed(4)}`)
      })
  }
}

// Example usage and testing
if (typeof window === "undefined") {
  FuzzySearch.test()
}
// Webview script for Select From List
const vscode = acquireVsCodeApi()

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

const list = new List()
list.items = localStorage.getItem("selectFromList.items")
  ? JSON.parse(localStorage.getItem("selectFromList.items"))
  : []
if (!Array.isArray(list.items)) list.items = []
list.selectedIndexes.add(0)
list.listElement = document.getElementById("list")

let scrollContainer = list.listElement.closest("main") || list.listElement.parentElement
if (scrollContainer) {
  scrollContainer.addEventListener("scroll", () => {
    list._scrollTop = scrollContainer.scrollTop
    list._viewportHeight = scrollContainer.clientHeight
    requestAnimationFrame(() => list.render())
  })
}

let currentRequestId = null

if (list.items.length > 0) list.render()

addEventListener("message", (event) => {
  const message = event.data
  if (!message || typeof message !== "object") return

  if (message.type === "init") {
    list.items = Array.isArray(message.items) ? message.items : []
    list.limitFilteredResults = message.limitFilteredResults || null
    currentRequestId = message.requestId || null

    const filterElement = document.getElementById("filter")
    list.filterText = filterElement.value || ""

    let initialFilter = (message.initialFilter || "").trim()
    if (initialFilter) {
      list.filterText = initialFilter
      filterElement.value = initialFilter
    }

    list.selectedIndexes = new Set()
    if (list.items.length > 0) list.selectedIndexes.add(0)
    list.currentRow = 0
    list.anchorIndex = 0
    list.computeVisible()

    let scrollContainer = list.listElement.closest("main") || list.listElement.parentElement
    if (scrollContainer) {
      list._viewportHeight = scrollContainer.clientHeight
    }

    if (initialFilter && list.visibleItems.length === 0) {
      list.filterText = ""
      filterElement.value = ""
      list.computeVisible()
    }
    list.render()
    setTimeout(() => filterElement.focus(), 0)
  }
})

// Handle webview becoming visible again
addEventListener("focus", () => {
  const filterElement = document.getElementById("filter")
  setTimeout(() => filterElement.focus(), 0)
})

// Also handle when the window becomes visible
addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    const filterElement = document.getElementById("filter")
    setTimeout(() => filterElement.focus(), 0)
  }
})

const filterInput = document.getElementById("filter")
let filterTimeout = null
filterInput.addEventListener("input", (event) => {
  list.filterText = event.target.value || ""
  clearTimeout(filterTimeout)
  filterTimeout = setTimeout(() => {
    list.selectedIndexes = new Set()
    list.computeVisible()
    // NOTE: Always highlight first visible item after filtering - core UX behavior
    if (list.visibleItems.length > 0) {
      list.selectedIndexes.add(list.visibleItems[0].idx)
      list.setFocusRow(0, false)
    }
    requestAnimationFrame(() => list.render())
  }, 150)
})

let _lastClickTime = 0

// NOTE: Multi-select interaction is a core feature - preserve these behaviors:
// - Regular click: select only this item (standard behavior)
// - Cmd+click: toggle item in/out of selection (multi-select)
// - Shift+click: range select from anchor to clicked item
// - Double-click: submit selection immediately
list.listElement.addEventListener("click", (event) => {
  let listItem = event.target.closest("li")
  if (!listItem) return
  let row = parseInt(listItem.dataset.row, 10)
  filterInput.focus()

  if (event.timeStamp - _lastClickTime < 250) {
    list.selectOnlyRow(row)
    submit()
    return
  } else {
    _lastClickTime = event.timeStamp
    if (event.shiftKey) {
      list.rangeSelectToRow(row)
    } else if (event.metaKey || event.ctrlKey) {
      list.toggleRow(row)
    } else {
      list.selectOnlyRow(row)
    }
  }
})

// NOTE: Keyboard navigation is a core feature - these shortcuts must work:
// - Arrow keys: move focus, with shift for range selection
// - Alt+arrows: jump to first/last item
// - Space: toggle current item
// - Cmd+A: select all visible items
// - Enter: submit selection
// - Alt+Enter: submit with alternate action (close other files)
// - Escape: cancel
document.addEventListener("keydown", (event) => {
  let { key, code, shiftKey, metaKey, altKey } = event
  let down = key === "ArrowDown"
  let up = key === "ArrowUp"
  let space = key === " " || code === "Space"
  let enter = key === "Enter"
  let esc = key === "Escape"

  // Always handle these keys for the list, regardless of focus
  if (down || up || space || enter || esc || (metaKey && code === "KeyA")) {
    if (list.visibleItems.length === 0 && !esc) return

    if (down) {
      event.preventDefault()
      let next = Math.min(list.currentRow + 1, list.visibleItems.length - 1)
      if (altKey) next = list.visibleItems.length - 1 // Jump to last
      if (shiftKey) {
        list.rangeSelectToRow(next)
      } else {
        list.selectOnlyRow(next)
      }
    } else if (up) {
      event.preventDefault()
      let prev = Math.max(list.currentRow - 1, 0)
      if (altKey) prev = 0 // Jump to first
      if (shiftKey) {
        list.rangeSelectToRow(prev)
      } else {
        list.selectOnlyRow(prev)
      }
    } else if (space && list.visibleItems.length > 0) {
      event.preventDefault()
      list.toggleRow(list.currentRow)
    } else if (metaKey && code === "KeyA") {
      event.preventDefault()
      list.selectedIndexes = new Set(
        list.visibleItems.map((visibleItem) => visibleItem.idx)
      )
      list.render()
    } else if (enter && list.visibleItems.length > 0) {
      event.preventDefault()
      submit({ alternate: altKey })
    } else if (esc) {
      event.preventDefault()
      cancel()
    }
  }
})

function submit({alternate = false} = {}) {
  const indexes = Array.from(list.selectedIndexes)
    .filter(Number.isInteger)
    .sort((a, b) => a - b)
  let range = list.filterText.substring(list.filterText.indexOf(":") + 1).trim()
  vscode.postMessage({
    type: "submit",
    indexes,
    range,
    alternate,
    requestId: currentRequestId
  })
}

function cancel() {
  vscode.postMessage({
    type: "cancel",
    requestId: currentRequestId
  })
}

// Notify extension we're ready
vscode.postMessage({
  type: "ready",
  requestId: currentRequestId
})

window.addEventListener("unload", () => {
  localStorage.setItem("selectFromList.filterText", list.filterText)
  localStorage.setItem("selectFromList.items", JSON.stringify(list.items))
})
