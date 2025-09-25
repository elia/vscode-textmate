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
  }

  fuzzyScore(pattern, ...strings) {
    pattern = pattern.trim().toLowerCase()
    if (!pattern) return 0
    let score = 0
    for (let str of strings) {
      str = String(str || "").toLowerCase()
      let patternIdx = 0
      let consecutive = 0
      let maxConsecutive = 0
      let firstMatchIdx = -1
      for (let i = 0; i < str.length; i++) {
        if (str[i] === pattern[patternIdx]) {
          if (firstMatchIdx < 0) firstMatchIdx = i
          patternIdx++
          consecutive++
          maxConsecutive = Math.max(maxConsecutive, consecutive)
          if (patternIdx === pattern.length) break
        } else {
          consecutive = 0
        }
      }
      if (patternIdx !== pattern.length) return 0 // not all chars matched
      score += 1 + maxConsecutive * 5 + (str.length - firstMatchIdx) * 0.01
    }
    return score
  }

  computeVisible() {
    this.visibleItems = []
    const filter = (this.filterText || "").trim().toLowerCase()

    for (let index = 0; index < this.items.length; index++) {
      let item = this.items[index]
      let matchOn =
        item.matchOn ||
        (item.matchOn = String(
          item.matchOn || `${item.description} ${item.label}`,
        )).toLowerCase()
      if (!item.idx) item.idx = index

      if (!filter) {
        this.visibleItems.push(item)
        continue
      }

      let score = this.fuzzyScore(filter, matchOn)

      if (score > 0) {
        this.visibleItems.push(item)
        continue
      }

      // Simple substring match as fallback
      if (filter && !matchOn.toLowerCase().includes(filter)) {
        this.selectedIndexes.delete(index)
        continue
      }

      this.visibleItems.push(item)
    }

    if (this.currentRow >= this.visibleItems.length)
      this.currentRow = Math.max(0, this.visibleItems.length - 1)
    if (this.currentRow < 0) this.currentRow = 0
    if (this.selectedIndexes.size === 0 && this.visibleItems[0])
      this.selectedIndexes.add(this.visibleItems[0].idx || 0)

    // Reset anchor to current focused item if anchor is no longer visible
    if (this.getRowFromIndex(this.anchorIndex) < 0 && this.visibleItems[this.currentRow]) {
      this.anchorIndex = this.visibleItems[this.currentRow].idx
    }
  }

  renderElement(item, escapeHtml) {
    const { idx: itemIndex, label, description } = item
    const listItem = document.createElement("li")
    listItem.className = "row item-content"
    listItem.dataset.idx = String(itemIndex)
    listItem.setAttribute("role", "option")
    listItem.setAttribute(
      "aria-selected",
      this.selectedIndexes.has(itemIndex) ? "true" : "false",
    )

    let html = `<div class="item-label">${escapeHtml(label)}</div>`
    if (description)
      html += `<div class="item-description">${escapeHtml(description)}</div>`
    listItem.innerHTML = html
    return listItem
  }

  render(escapeHtml) {
    // Check if the rendered items have changed
    let renderedVisibleItems = this.visibleItems.map((item) => item.idx).join(",")
    this._renderedVisibleItems = renderedVisibleItems

    this._itemElements = this._itemElements || {}

    const fragment = document.createDocumentFragment()
    for (let row = 0; row < this.visibleItems.length; row++) {
      let item = this.visibleItems[row]
      let listItem =
        this._itemElements[item.idx] ||
        (this._itemElements[item.idx] = this.renderElement(item, escapeHtml))

      listItem.dataset.row = String(row)
      listItem.id = "row-" + row

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

      fragment.appendChild(listItem)
    }
    this.listElement.innerHTML = ""
    this.listElement.appendChild(fragment)
    if (this.visibleItems.length > 0)
      this.listElement.setAttribute("aria-activedescendant", "row-" + this.currentRow)
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
    const listItem = this.listElement.querySelector('li[data-row="' + row + '"]')
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
    if (this.selectedIndexes.has(itemIndex)) this.selectedIndexes.delete(itemIndex)
    else this.selectedIndexes.add(itemIndex)
    this.anchorIndex = itemIndex
    this.setFocusRow(row, false, escapeHtml)
    this.ensureRowVisible(row)
  }
}


// Webview script for Select From List (macOS-like multi-select)
;(() => {
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
  
  if (list.items.length > 0) list.render(escapeHtml)

  addEventListener("message", (event) => {
    console.log("[DEBUG] main.js received message:", event.data)
    const message = event.data
    if (!message || typeof message !== "object") return
    if (message.type === "init") {
      console.log("[DEBUG] Initializing with", message.items?.length || 0, "items")
      list.items = Array.isArray(message.items) ? message.items : []

      // Preserve any text typed before JS loaded
      const filterElement = document.getElementById("filter")
      list.filterText =
        (filterElement && filterElement.__earlyInput) ||
        filterElement.value ||
        ""

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
    vscode.postMessage({ type: "submit", indexes })
  }

  function cancel() {
    vscode.postMessage({ type: "cancel" })
  }

  // document.getElementById("submit").addEventListener("click", submit)
  // document.getElementById("cancel").addEventListener("click", cancel)

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
})()
