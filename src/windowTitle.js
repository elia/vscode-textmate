// Copyright (c) 2020 WiseTime. All rights reserved.

const vscode = require("vscode")

class BranchDetector {
  constructor(projectRootPath, branchDidChange) {
    const headFile = projectRootPath + "/.git/HEAD"
    this.readBranchName(headFile).then(branchDidChange)
    this.intervalId = setInterval(
      () =>
        this.readBranchName(headFile).then((branchName) => {
          if (this.branchName !== branchName) {
            this.branchName = branchName
            branchDidChange(branchName)
          }
        }),
      3000,
    )
  }

  dispose() {
    clearInterval(this.intervalId)
  }

  async readBranchName(headFilePath) {
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

const updateTitle = (branchName) => {
  vscode.workspace
    .getConfiguration("window")
    .update(
      "title",
      vscode.workspace
        .getConfiguration("tmcode")
        .get("windowTitle")
        .replace("${scmBranch}", branchName),
    )
  return Promise.resolve()
}

const activate = (context) => {
  // No open project, no Git repository.
  if (!vscode.workspace.workspaceFolders) return

  const projectRoot = vscode.workspace.workspaceFolders[0].uri.path

  context.subscriptions.push(new BranchDetector(projectRoot, updateTitle))
}

const deactivate = () => {
  updateTitle(null)
}

module.exports = {
  activate,
  deactivate,
}
