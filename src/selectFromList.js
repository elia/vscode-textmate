const vscode = require("vscode")
const fs = require("fs")

class SelectFromListViewProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri
    this.viewType = "vscode-textmate.selectFromListView"
    this._webviewView = null
    this._webviewPanel = null
    this._isReady = new Promise((resolve) => {
      this._resolveReady = resolve
    })
    this.reset()
    this._currentRequestId = null
    this._pendingResolve = null
  }

  get webview() {
    return this._webviewView?.webview || this._webviewPanel?.webview
  }

  reset() {
    this.items = []
    this.title = "Select From List"
    this._currentRequestId = null
    this._pendingResolve = null
  }

  close() {
    if (this._webviewPanel) {
      this._webviewPanel.dispose()
      this._webviewPanel = null
    } else if (this._webviewView) {
      // Hide the sidebar view when closing
      vscode.commands.executeCommand(
        "setContext",
        "vscode-textmate.selectFromListView.visible",
        false,
      )
      setTimeout(
        () => vscode.commands.executeCommand("workbench.view.explorer"),
        0,
      )
    }
  }

  dispose() {
    // Hide the view when disposing
    vscode.commands.executeCommand(
      "setContext",
      "vscode-textmate.selectFromListView.visible",
      false,
    )

    if (this._webviewPanel) {
      this._webviewPanel.dispose()
      this._webviewPanel = null
    }
    if (this._webviewView) {
      this._webviewView = null
    }
    this.reset()
  }

  writeResults(items) {
    if (this._pendingResolve) {
      this._pendingResolve(items)
      this._pendingResolve = null
    }
    this._currentRequestId = null
    this.close()
  }

  handleMessage(message) {
    if (typeof message !== "object") return
    let { type, requestId } = message
    if (type === "ready") {
      this._resolveReady()
      return
    }
    // Only handle messages for the current request
    if (!requestId || requestId !== this._currentRequestId) return
    switch (type) {
      case "submit": {
        let items = message.indexes.map((i) => this.items[i])
        items.meta = message
        this.writeResults(items)
        break
      }
      case "cancel":
        this.writeResults([])
        break
    }
  }

  setupWebview(webview) {
    webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
      retainContextWhenHidden: true,
    }
    webview.html = this.getHtml(webview)
    webview.onDidReceiveMessage(this.handleMessage.bind(this))
  }

  createWebviewPanel(title) {
    // Dispose of any existing panel first
    if (this._webviewPanel) {
      this._webviewPanel.dispose()
      this._webviewPanel = null
    }

    // Reset the ready promise when creating a new panel
    this._isReady = new Promise((resolve) => {
      this._resolveReady = resolve
    })

    this._webviewPanel = vscode.window.createWebviewPanel(
      "vscode-textmate.selectFromListPanel",
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
        retainContextWhenHidden: true,
      },
    )

    this.setupWebview(this._webviewPanel.webview)

    this._webviewPanel.onDidDispose(() => {
      this._webviewPanel = null
      if (this._resolve) {
        this.writeResults([])
      }
    })
  }

  resolveWebviewView(webviewView, _webviewContext, _token) {
    this._webviewView = webviewView
    this.setupWebview(webviewView.webview)
  }

  async initializeWebviewView(webviewHolder, items, options, requestId) {
    await this._isReady
    webviewHolder.webview.postMessage({
      type: "init",
      requestId,
      items,
      limitFilteredResults: options.limitFilteredResults,
      initialFilter: options.initialFilter || "",
    })
    if (options.title) webviewHolder.title = options.title
  }

  async chooseItems(items, options = {}) {
    // Always clear out any previous pending promise
    if (this._pendingResolve) {
      this._pendingResolve([])
      this._pendingResolve = null
      this._currentRequestId = null
    }
    return new Promise(async (resolve) => {
      this._pendingResolve = resolve
      this.items = items
      // Generate a unique requestId for this execution
      let requestId = Math.random().toString(36).slice(2) + Date.now()
      this._currentRequestId = requestId

      let renderAs =
        options.renderAs ||
        vscode.workspace
          .getConfiguration("vscode-textmate.selectFromList")
          .get("renderAs") ||
        "panel"

      if (renderAs === "panel") {
        if (this._webviewView) this._webviewView = null
        this.createWebviewPanel("Select From List")
        await this._isReady
        await this.initializeWebviewView(this._webviewPanel, items, options, requestId)
        this._webviewPanel.reveal(vscode.ViewColumn.Active, true)
      } else if (renderAs === "sidebar") {
        if (this._webviewPanel) {
          this._webviewPanel.dispose()
          this._webviewPanel = null
        }
        this._isReady = new Promise((resolve) => {
          this._resolveReady = resolve
        })
        vscode.commands.executeCommand(
          "setContext",
          "vscode-textmate.selectFromListView.visible",
          true,
        )
        await vscode.commands.executeCommand(
          "workbench.view.extension.vscodeTextmate",
        )
        await this.initializeWebviewView(this._webviewView, items, options, requestId)
        this._webviewView.show(true)
      }
    })
  }

  getHtml(webview) {
    const nonce = Math.random().toString(36).slice(2)
    let pathFor = (path) =>
      webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, path))

    let scriptUri = pathFor("src/selectFromList/main.js")
    let htmlUri = pathFor("src/selectFromList/index.html")
    let html = fs.readFileSync(htmlUri.fsPath, "utf8")

    html = html
      .replace(/\{\{cspSource\}\}/g, webview.cspSource)
      .replace(/\{\{nonce\}\}/g, nonce)
      .replace(/\{\{script\}\}/g, String(scriptUri))
    return html
  }
}

function activate(context) {
  let provider = new SelectFromListViewProvider(context.extensionUri)

  // Hide the view initially
  vscode.commands.executeCommand(
    "setContext",
    "vscode-textmate.selectFromListView.visible",
    false,
  )

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "vscode-textmate.selectFromListView",
      provider,
    ),
  )

  // Ensure provider is disposed when extension deactivates
  context.subscriptions.push({
    dispose: () => provider.dispose(),
  })

  // Command to populate and reveal the sidebar view
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-textmate.showSelectFromList",
      async (items, options) => {
        let title = options.title || "Select From List"
        let mappedItems = items.map((item) => {
          if (item == null) return String(item)
          if (typeof item === "string") return { label: item }
          if (typeof item === "number" || typeof item === "boolean")
            return { label: String(item) }
          if (typeof item === "object") return item
        })

        return provider.chooseItems(mappedItems, {
          title,
          canSelectMany: true,
          limitFilteredResults: null,
          ...options,
        })
      },
    ),
  )
}

function deactivate() {
  // VS Code will automatically call dispose on all subscriptions
  // but we can add any additional cleanup here if needed
}

module.exports = { activate, deactivate }
