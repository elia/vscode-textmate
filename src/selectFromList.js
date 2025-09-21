const vscode = require("vscode")
const fs = require("fs")

class SelectFromListViewProvider {
  constructor(extensionUri) {
    this._extensionUri = extensionUri
    this.viewType = "vscode-textmate.selectFromListView"
    this._webviewView = null
    this._isReady = new Promise((resolve) => {
      this._resolveReady = resolve
    })
    this.reset()
  }

  get webview() {
    return this._webviewView?.webview
  }

  reset() {
    this.items = []
    this.title = "Select From List"
    this._resolve = null
  }

  close() {
    setTimeout(
      () => vscode.commands.executeCommand("workbench.view.explorer"),
      0,
    )
  }

  writeResults(items) {
    console.log("writeResults", items)
    if (this._resolve) {
      this._resolve(items)
      this._resolve = null
    }
    this.close()
  }

  resolveWebviewView(webviewView, _webviewContext, _token) {
    this._webviewView = webviewView
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    }
    webviewView.webview.html = this.getHtml(webviewView.webview)

    webviewView.webview.onDidReceiveMessage((message) => {
      if (typeof message !== "object") return

      switch (message.type) {
        case "ready": {
          this._resolveReady()
          break
        }
        case "submit": {
          this.writeResults(message.indexes.map((i) => this.items[i]))
          break
        }
        case "cancel":
          this.writeResults([])
          break
      }
    })
  }


  async chooseItems(items, options = {}) {
    return new Promise(async (resolve) => {
      this._resolve = resolve
      await this._isReady
      this.items = items
      this._webviewView.webview.postMessage({ type: "init", items })
      this._webviewView.title = options.title || "Select From List"
      this._webviewView.show(true)
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

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "vscode-textmate.selectFromListView",
      provider,
    ),
  )

  // Command to populate and reveal the sidebar view
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-textmate.showSelectFromList",
      async (items, options) => {
        let title = options.title || "Select From List"
        items.map((item) => {
          if (item == null) return String(item)
          if (typeof item === "string") return { label: item }
          if (typeof item === "number" || typeof item === "boolean")
            return { label: String(item) }
          if (typeof item === "object") return item
        })

        await vscode.commands.executeCommand(
          "workbench.view.extension.vscodeTextmate",
        )

        return provider.chooseItems(items, {
          title,
          canSelectMany: true,
        })
      },
    ),
  )
}

module.exports = { activate }
