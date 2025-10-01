// REF: https://code.visualstudio.com/api/extension-guides/webview
/* global localStorage, acquireVsCodeApi, document, addEventListener, window */

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
  }

  computeVisible() {
    this.visibleItems = []
    const filter = (this.filterText || "").trim().toLowerCase().split(":")[0]

    for (let index = 0; index < this.items.length; index++) {
      let item = this.items[index]
      if (!item.idx) item.idx = index

      if (!filter) {
        this.visibleItems.push(item)
        continue
      }

      item.score = FuzzySearch.rankFile(filter, item.label, item.description)

      if (item.score > 0) {
        this.visibleItems.push(item)
      } else {
        this.selectedIndexes.delete(index)
      }
    }

    this.visibleItems = this.visibleItems.sort((a, b) => b.score - a.score)

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

  renderElement(item, escapeHtml) {
    const { idx: itemIndex, label, description } = item
    const listItem = document.createElement("li")
    listItem.className = "row"
    listItem.dataset.idx = String(itemIndex)
    listItem.setAttribute("role", "option")
    listItem.setAttribute(
      "aria-selected",
      this.selectedIndexes.has(itemIndex) ? "true" : "false",
    )

    let html = `<div class="item-label">${escapeHtml(label)}`
    if (description)
      html += `<div class="item-description">${escapeHtml(description)}</div>`
    listItem.innerHTML = `<div class="item-content">${html}</div>`
    return listItem
  }

  render(escapeHtml) {
    // Check if the rendered items have changed
    let renderedVisibleItems = this.visibleItems
      .map((item) => item.idx)
      .join(",")
    this._renderedVisibleItems = renderedVisibleItems

    this._itemElements = this._itemElements || {}

    let elements = []
    for (let row = 0; row < this.visibleItems.length; row++) {
      let item = this.visibleItems[row]
      let listItem =
        this._itemElements[item.idx] ||
        (this._itemElements[item.idx] = this.renderElement(item, escapeHtml))

      listItem.dataset.row = String(row)
      listItem.id = "row-" + row
      listItem.dataset.score = String(item.score || 0)
      if (item.isRecent)
        listItem.dataset.label = "recent"
      else delete listItem.dataset.label

      if (this.selectedIndexes.has(item.idx)) {
        listItem.classList.add("selected")
      } else {
        listItem.classList.remove("selected")
      }
      if (row === this.currentRow) {
        listItem.classList.add("focused")
        listItem.setAttribute("aria-current", "true")
      } else {
        listItem.classList.remove("focused")
        listItem.removeAttribute("aria-current")
      }

      elements.push(listItem)

      if (
        this.limitFilteredResults &&
        elements.length >= this.limitFilteredResults
      ) {
        break
      }
    }
    this.listElement.replaceChildren(...elements)
    if (this.visibleItems.length > 0)
      this.listElement.setAttribute(
        "aria-activedescendant",
        "row-" + this.currentRow,
      )
    else this.listElement.removeAttribute("aria-activedescendant")
  }

  getIndexFromRow(row) {
    const visibleItem = this.visibleItems[row]
    return visibleItem ? visibleItem.idx : -1
  }

  getRowFromIndex(idx) {
    return this.visibleItems.findIndex((visibleItem) => visibleItem.idx === idx)
  }

  ensureRowVisible(row) {
    const listItem = this.listElement.querySelector(
      'li[data-row="' + row + '"]',
    )
    if (listItem) listItem.scrollIntoView({ block: "nearest" })
  }

  setFocusRow(row, shouldScroll = true, escapeHtml) {
    if (this.visibleItems.length === 0) return
    row = Math.max(0, Math.min(row, this.visibleItems.length - 1))
    this.currentRow = row
    this.render(escapeHtml)
    if (shouldScroll) this.ensureRowVisible(this.currentRow)
  }

  selectOnlyRow(row, escapeHtml) {
    const itemIndex = this.getIndexFromRow(row)
    this.selectedIndexes = new Set()
    if (itemIndex >= 0) this.selectedIndexes.add(itemIndex)
    this.anchorIndex = itemIndex
    this.setFocusRow(row, true, escapeHtml)
  }

  rangeSelectToRow(row, escapeHtml) {
    if (this.visibleItems.length === 0) return
    if (this.anchorIndex == null) return this.selectOnlyRow(row, escapeHtml)
    const anchorRow = (() => {
      const foundRow = this.getRowFromIndex(this.anchorIndex)
      return foundRow >= 0 ? foundRow : row
    })()
    const start = Math.min(anchorRow, row)
    const end = Math.max(anchorRow, row)
    this.selectedIndexes = new Set()
    for (let rowIndex = start; rowIndex <= end; rowIndex++)
      this.selectedIndexes.add(this.getIndexFromRow(rowIndex))
    this.setFocusRow(row, true, escapeHtml)
  }

  toggleRow(row, escapeHtml) {
    const itemIndex = this.getIndexFromRow(row)
    if (itemIndex < 0) return
    if (this.selectedIndexes.has(itemIndex))
      this.selectedIndexes.delete(itemIndex)
    else this.selectedIndexes.add(itemIndex)
    this.anchorIndex = itemIndex
    this.setFocusRow(row, false, escapeHtml)
    this.ensureRowVisible(row)
  }
}

/**
 * TextMate-style Fuzzy Search Algorithm
 * Vanilla JavaScript implementation of the ranking algorithm from ranker.cc
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
    return /[a-zA-Z0-9]/.test(ch)
  }

  /**
   * Calculate the fuzzy match rank between filter and candidate
   * @param {string} lhs - The filter string (needle)
   * @param {string} rhs - The candidate string (haystack)
   * @param {Array} out - Optional array to store match ranges
   * @returns {number} Score between 0-1, higher is better
   */
  static calculateRank(lhs, rhs, out = null) {
    const n = lhs.length
    const m = rhs.length

    // Initialize matrices and arrays
    const matrix = Array(n)
      .fill()
      .map(() => Array(m).fill(0))
    const first = Array(n).fill(m)
    const last = Array(n).fill(0)
    const capitals = Array(m)

    // Mark capital letters and word boundaries
    let atBow = true // at beginning of word
    for (let j = 0; j < m; j++) {
      const ch = rhs[j]
      capitals[j] = (atBow && this.isAlnum(ch)) || this.isUpper(ch)
      atBow = !this.isAlnum(ch) && ch !== "'" && ch !== "."
    }

    // Fill the matrix with match lengths
    for (let i = 0; i < n; i++) {
      let j = i === 0 ? 0 : first[i - 1] + 1
      for (; j < m; j++) {
        if (lhs[i].toLowerCase() === rhs[j].toLowerCase()) {
          matrix[i][j] = i === 0 || j === 0 ? 1 : matrix[i - 1][j - 1] + 1
          first[i] = Math.min(j, first[i])
          last[i] = Math.max(j + 1, last[i])
        }
      }
    }

    // Optimize search boundaries (backward pass)
    for (let i = n - 1; i > 0; i--) {
      let bound = last[i] - 1
      if (bound < last[i - 1]) {
        while (first[i - 1] < bound && matrix[i - 1][bound - 1] === 0) {
          bound--
        }
        last[i - 1] = bound
      }
    }

    // Propagate match lengths backward
    for (let i = n - 1; i > 0; i--) {
      for (let j = first[i]; j < last[i]; j++) {
        if (matrix[i][j] && matrix[i - 1][j - 1]) {
          matrix[i - 1][j - 1] = matrix[i][j]
        }
      }
    }

    // Propagate match lengths forward
    for (let i = 0; i < n; i++) {
      for (let j = first[i]; j < last[i]; j++) {
        if (matrix[i][j] > 1 && i + 1 < n && j + 1 < m) {
          matrix[i + 1][j + 1] = matrix[i][j] - 1
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
      for (let j = first[i]; j < last[i]; j++) {
        if (matrix[i][j] && capitals[j]) {
          bestJIndex = j
          bestJLength = matrix[i][j]

          // Count capitals touched in this match
          for (let k = j; k < j + bestJLength; k++) {
            if (capitals[k]) capitalsTouched++
          }
          break
        } else if (bestJLength < matrix[i][j]) {
          bestJIndex = j
          bestJLength = matrix[i][j]
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

        first[i] = Math.max(bestJIndex + len, first[i])
        if (len < bestJLength && n < 4) {
          if (capitals[first[i]]) {
            continue
          }

          for (let j = first[i]; j < last[i] && !foundCapital; j++) {
            if (matrix[i][j] && capitals[j]) {
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
    const totalCapitals = capitals.filter((c) => c).length
    let score = 0.0
    const denom = n * (n + 1) + 1

    if (n === capitalsTouched) {
      score = (denom - 1) / denom
    } else {
      const subtract = substrings * n + (n - capitalsTouched)
      score = (denom - subtract) / denom
    }

    score += (m - prefixSize) / m / (2 * denom)
    score += capitalsTouched / totalCapitals / (4 * denom)
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
    ]

    console.log('\nSearch results for "doc":')
    const results = this.search("doc", files)
    results.forEach(({ item, score }) => {
      console.log(`  ${item}: ${score.toFixed(4)}`)
    })
  }
}

// Example usage and testing
if (typeof window === "undefined") {
  FuzzySearch.test()
}

// Webview script for Select From List (macOS-like multi-select)
console.log("[DEBUG] main.js loaded")
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
list.selectedIndexes.add(0) // Initially select first item
list.listElement = document.getElementById("list")

// // Restore filter text from localStorage
// list.filterText = localStorage.getItem("selectFromList.filterText") || ""
// document.getElementById("filter").value = list.filterText

if (list.items.length > 0) list.render(escapeHtml)

addEventListener("message", (event) => {
  console.log("[DEBUG] main.js received message:", event.data)
  const message = event.data
  if (!message || typeof message !== "object") return
  if (message.type === "init") {
    console.log("[DEBUG] Initializing with", message)
    list.items = Array.isArray(message.items) ? message.items : []
    list.limitFilteredResults = message.limitFilteredResults || null

    // Preserve any text typed before JS loaded
    const filterElement = document.getElementById("filter")
    list.filterText =
      (filterElement && filterElement.__earlyInput) || filterElement.value || ""
    // document.getElementById("filter").value = list.filterText

    list.selectedIndexes = new Set()
    if (list.items.length > 0) list.selectedIndexes.add(0)
    list.currentRow = 0
    list.anchorIndex = 0
    list.computeVisible()
    list.render(escapeHtml)
    setTimeout(() => {
      filterElement && filterElement.focus()
    }, 0)
  }
})

const filterInput = document.getElementById("filter")

filterInput.addEventListener("input", (event) => {
  list.filterText = event.target.value || ""
  list.selectedIndexes = new Set()
  list.computeVisible()
  list.render(escapeHtml)
})

let _lastClickTime = 0

list.listElement.addEventListener("click", (event) => {
  let listItem = event.target.closest("li")
  if (!listItem) return
  let row = parseInt(listItem.dataset.row, 10)
  filterInput.focus()

  // Handle double-click manually to work around vscode not firing dblclick event
  // in webview for some reason.
  if (event.timeStamp - _lastClickTime < 250) {
    if (!listItem) return
    list.selectOnlyRow(row, escapeHtml)
    submit()
    return
  } else {
    _lastClickTime = event.timeStamp
    if (event.shiftKey) list.rangeSelectToRow(row, escapeHtml)
    else if (event.metaKey) list.toggleRow(row, escapeHtml)
    else list.selectOnlyRow(row, escapeHtml)
  }
})

document.addEventListener("keydown", (event) => {
  let {
    key,
    code,
    shiftKey: shift,
    metaKey: meta,
    ctrlKey: _ctrl,
    altKey: alt,
  } = event
  let down = key === "ArrowDown"
  let up = key === "ArrowUp"
  let space = key === " " || code === "Space"
  let enter = key === "Enter"
  let esc = key === "Escape"

  if (list.visibleItems.length === 0) return

  if (down) {
    event.preventDefault()
    let next = Math.min(list.currentRow + 1, list.visibleItems.length - 1)
    if (alt) next = list.visibleItems.length - 1
    if (shift) list.rangeSelectToRow(next, escapeHtml)
    else list.selectOnlyRow(next, escapeHtml)
  } else if (up) {
    event.preventDefault()
    let prev = Math.max(list.currentRow - 1, 0)
    if (alt) prev = 0
    if (shift) list.rangeSelectToRow(prev, escapeHtml)
    else list.selectOnlyRow(prev, escapeHtml)
  } else if (space) {
    event.preventDefault()
    list.toggleRow(list.currentRow, escapeHtml)
  } else if (meta && code === "KeyA") {
    event.preventDefault()
    list.selectedIndexes = new Set(
      list.visibleItems.map((visibleItem) => visibleItem.idx),
    )
    list.render(escapeHtml)
  } else if (enter) {
    event.preventDefault()
    submit()
  } else if (esc) {
    event.preventDefault()
    cancel()
  }
})

function submit() {
  const indexes = Array.from(list.selectedIndexes)
    .filter(Number.isInteger)
    .sort((a, b) => a - b)
  let range = list.filterText.substring(list.filterText.indexOf(":") + 1).trim()
  console.log("submit", indexes, range)
  vscode.postMessage({ type: "submit", indexes, range })
}

function cancel() {
  vscode.postMessage({ type: "cancel" })
}

// Notify extension we're ready to receive items
console.log("[DEBUG] Sending ready message to extension")
vscode.postMessage({ type: "ready" })

// Debug page lifecycle events
window.addEventListener("beforeunload", () => {
  console.log("[DEBUG] Page is about to unload")
})

window.addEventListener("unload", () => {
  localStorage.setItem("selectFromList.filterText", list.filterText)
  localStorage.setItem("selectFromList.items", JSON.stringify(list.items))

  console.log("[DEBUG] Page is unloading")
})
