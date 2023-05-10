// Copyright (c) 2020 WiseTime. All rights reserved.

const vscode = require("vscode")

class WindowTitleUpdater {
  constructor(projectRootPath) {
    this.projectRootPath = projectRootPath
    this.updateTitle()
    this.intervalId = setInterval(() => this.updateTitle(), 3000)
  }

  async updateTitle() {
    const workspace = vscode.workspace
    let windowTitle = workspace.getConfiguration("vscode-textmate", null).get("windowTitle")
    const currentTitle = workspace.getConfiguration("window", workspace.uri).get("title")

    console.log({currentTitle, windowTitle})

    windowTitle = titleMarker + windowTitle
    if (windowTitle.includes("${scmBranch}"))
      windowTitle = windowTitle.replace("${scmBranch}", await this.readBranchName())

    if (
      currentTitle === "" || 
      (!currentTitle || currentTitle.startsWith(titleMarker)) &&
      windowTitle !== currentTitle
    ) {
      workspace
        .getConfiguration("window", workspace.uri)
        .update("title", windowTitle)
      return Promise.resolve()
    }
  }

  dispose() {
    clearInterval(this.intervalId)
  }

  async readBranchName() {
    const headFilePath = this.projectRootPath + "/.git/HEAD"

    try {
      const data = await vscode.workspace.fs.readFile(
        vscode.Uri.file(headFilePath),
      )
      const content = Buffer.from(data).toString("utf8")
      if (content.startsWith("ref: refs/heads/")) {
        return content.replace(/^(ref: refs\/heads\/\.*)/, "").trim()
      }
    } catch (_) {
      // Unable to read file. Perhaps it does not exist.
    }
    return undefined
  }
}

const titleMarker = '${vscode-textmate}'

const activate = (context) => {
  // No open project, no Git repository.
  if (!vscode.workspace.workspaceFolders) return

  const updater = new WindowTitleUpdater(vscode.workspace.workspaceFolders[0].uri.path)

  context.subscriptions.push(updater)
  vscode.workspace.onDidChangeConfiguration(async (event) => await updater.updateTitle())
}

const deactivate = () => {
}

module.exports = {
  activate,
  deactivate,
}
