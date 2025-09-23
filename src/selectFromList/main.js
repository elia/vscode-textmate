// REF: https://code.visualstudio.com/api/extension-guides/webview
/* global acquireVsCodeApi, document, addEventListener */

// Webview script for Select From List (macOS-like multi-select)
;(() => {
  const vscode = acquireVsCodeApi()
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
  }

  /** @type {any[]} */
  let items = []
  let filterText = ""
  let selectedIndexes = new Set()
  selectedIndexes.add(0) // Initially select first item
  let visibleItems = [] // [{ idx, label }]
  let currentRow = 0
  let anchorIndex = 0

  const listElement = document.getElementById("list")

  function computeVisible() {
    visibleItems = []
    const filter = (filterText || "").trim().toLowerCase()
    for (let index = 0; index < items.length; index++) {
      let item = items[index]
      let label = String(item.label || item.name || item.title || item.id)
      let description = item.description || ""
      if (
        filter &&
        !label.toLowerCase().includes(filter) &&
        !description.toLowerCase().includes(filter)
      ) {
        selectedIndexes.delete(index)
        continue
      }
      // if (item.kind == vscode.QuickPickItemKind.Separator) continue
      visibleItems.push({ idx: index, label, description })
    }
    if (currentRow >= visibleItems.length)
      currentRow = Math.max(0, visibleItems.length - 1)
    if (currentRow < 0) currentRow = 0
    if (selectedIndexes.size === 0 && visibleItems[0])
      selectedIndexes.add(visibleItems[0].idx || 0)

    // Reset anchor to current focused item if anchor is no longer visible
    if (getRowFromIndex(anchorIndex) < 0 && visibleItems[currentRow]) {
      anchorIndex = visibleItems[currentRow].idx
    }
  }

  function renderElement(item, row) {
    const { idx: itemIndex, label, description } = item
    const listItem = document.createElement("li")
    listItem.className = "row"
    listItem.dataset.row = String(row)
    listItem.dataset.idx = String(itemIndex)
    listItem.id = "row-" + row
    listItem.setAttribute("role", "option")
    listItem.setAttribute(
      "aria-selected",
      selectedIndexes.has(itemIndex) ? "true" : "false",
    )

    const descriptionHtml = description
      ? `<div class="item-description">${escapeHtml(description)}</div>`
      : ""

    listItem.innerHTML = `
        <label class="${""}">
          <input hidden type="checkbox" value="${itemIndex}">
          <div class="item-content">
            <div class="item-label">${escapeHtml(label)}</div>
            ${descriptionHtml}
          </div>
        </label>
      `
    return listItem
  }

  function render() {
    // Check if the rendered items have changed
    let renderedVisibleItems = visibleItems.map((item) => item.idx).join(",")
    // if (renderedVisibleItems === this._renderedVisibleItems) return
    console.log("Rendering visible items:", renderedVisibleItems)
    console.log("Changed?", renderedVisibleItems !== this._renderedVisibleItems)
    this._renderedVisibleItems = renderedVisibleItems

    this._itemElements = this._itemElements || {}

    const fragment = document.createDocumentFragment()
    for (let row = 0; row < visibleItems.length; row++) {
      let item = visibleItems[row]
      let listItem =
        this._itemElements[item.idx] ||
        (this._itemElements[item.idx] = renderElement(item, row))

      if (selectedIndexes.has(item.idx)) {
        listItem.classList.add("selected")
        listItem.querySelector('input[type="checkbox"]').checked = true
      } else {
        listItem.classList.remove("selected")
        listItem.querySelector('input[type="checkbox"]').checked = false
      }
      if (row === currentRow) {
        listItem.classList.add("focused")
        listItem.setAttribute("aria-current", "true")
      } else {
        listItem.classList.remove("focused")
        listItem.removeAttribute("aria-current")
      }

      fragment.appendChild(listItem)
    }
    listElement.innerHTML = ""
    listElement.appendChild(fragment)
    if (visibleItems.length > 0)
      listElement.setAttribute("aria-activedescendant", "row-" + currentRow)
    else listElement.removeAttribute("aria-activedescendant")
  }

  function getIndexFromRow(row) {
    const visibleItem = visibleItems[row]
    return visibleItem ? visibleItem.idx : -1
  }
  function getRowFromIndex(idx) {
    return visibleItems.findIndex((visibleItem) => visibleItem.idx === idx)
  }
  function ensureRowVisible(row) {
    const listItem = listElement.querySelector('li[data-row="' + row + '"]')
    if (listItem) listItem.scrollIntoView({ block: "nearest" })
  }
  function setFocusRow(row, shouldScroll = true) {
    if (visibleItems.length === 0) return
    row = Math.max(0, Math.min(row, visibleItems.length - 1))
    currentRow = row
    render()
    if (shouldScroll) ensureRowVisible(currentRow)
  }
  function selectOnlyRow(row) {
    const itemIndex = getIndexFromRow(row)
    selectedIndexes = new Set()
    if (itemIndex >= 0) selectedIndexes.add(itemIndex)
    anchorIndex = itemIndex
    setFocusRow(row)
  }
  function rangeSelectToRow(row) {
    if (visibleItems.length === 0) return
    if (anchorIndex == null) return selectOnlyRow(row)
    const anchorRow = (() => {
      const foundRow = getRowFromIndex(anchorIndex)
      return foundRow >= 0 ? foundRow : row
    })()
    const start = Math.min(anchorRow, row)
    const end = Math.max(anchorRow, row)
    selectedIndexes = new Set()
    for (let rowIndex = start; rowIndex <= end; rowIndex++)
      selectedIndexes.add(getIndexFromRow(rowIndex))
    setFocusRow(row)
  }
  function toggleRow(row) {
    const itemIndex = getIndexFromRow(row)
    if (itemIndex < 0) return
    if (selectedIndexes.has(itemIndex)) selectedIndexes.delete(itemIndex)
    else selectedIndexes.add(itemIndex)
    anchorIndex = itemIndex
    setFocusRow(row, false)
    ensureRowVisible(row)
  }

  addEventListener("message", (event) => {
    const message = event.data
    if (!message || typeof message !== "object") return
    if (message.type === "init") {
      items = Array.isArray(message.items) ? message.items : []
      filterText = ""
      selectedIndexes = new Set()
      if (items.length > 0) selectedIndexes.add(0)
      currentRow = 0
      anchorIndex = 0
      computeVisible()
      render()
      setTimeout(() => {
        const filterElement = document.getElementById("filter")
        filterElement && filterElement.focus()
      }, 0)
    }
  })

  document.getElementById("filter").addEventListener("input", (event) => {
    filterText = event.target.value || ""
    selectedIndexes = new Set()
    computeVisible()
    render()
  })

  this._lastClickTime = 0

  listElement.addEventListener("click", (event) => {
    let listItem = event.target.closest("li")
    if (!listItem) return
    let row = parseInt(listItem.dataset.row, 10)

    // Handle double-click manually to work around vscode not firing dblclick event
    // in webview for some reason.
    if (event.timeStamp - this._lastClickTime < 250) {
      if (!listItem) return
      selectOnlyRow(row)
      submit()
      return
    } else {
      this._lastClickTime = event.timeStamp
      if (
        event.target.tagName &&
        event.target.tagName.toLowerCase() === "input"
      ) {
        event.preventDefault()
      }
      if (event.shiftKey) rangeSelectToRow(row)
      else if (event.metaKey) toggleRow(row)
      else selectOnlyRow(row)
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

    if (visibleItems.length === 0) return

    if (down) {
      event.preventDefault()
      let next = Math.min(currentRow + 1, visibleItems.length - 1)
      if (alt) next = visibleItems.length - 1
      if (shift) rangeSelectToRow(next)
      else selectOnlyRow(next)
    } else if (up) {
      event.preventDefault()
      let prev = Math.max(currentRow - 1, 0)
      if (alt) prev = 0
      if (shift) rangeSelectToRow(prev)
      else selectOnlyRow(prev)
    } else if (space) {
      event.preventDefault()
      toggleRow(currentRow)
    } else if (meta && code === "KeyA") {
      event.preventDefault()
      selectedIndexes = new Set(
        visibleItems.map((visibleItem) => visibleItem.idx),
      )
      render()
    } else if (enter) {
      event.preventDefault()
      submit()
    } else if (esc) {
      event.preventDefault()
      cancel()
    }
  })

  function submit() {
    const indexes = Array.from(selectedIndexes)
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
  vscode.postMessage({ type: "ready" })
})()
