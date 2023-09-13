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
    let windowTitle = workspace
      .getConfiguration("vscode-textmate", null)
      .get("windowTitle")
    const currentTitle = workspace
      .getConfiguration("window", workspace.uri)
      .get("title")

    windowTitle = titleMarker + windowTitle
    if (windowTitle.includes("${scmBranch}"))
      try {
        windowTitle = windowTitle.replace(
          "${scmBranch}",
          await this.readBranchName(),
        )
      } catch (e) {
        windowTitle = `${this.titleMarker} ERROR: ${e.message}`
      }
    if (
      currentTitle === "" ||
      ((!currentTitle || currentTitle.startsWith(titleMarker)) &&
        windowTitle !== currentTitle)
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
    const fs = vscode.workspace.fs

    const readFile = async (path) => {
      try {
        const data = await fs.readFile(vscode.Uri.file(path))
        return Buffer.from(data).toString("utf8")
      } catch (e) {
        return `Cannot read ${path} - ${e.message}`
      }
    }

    const defaultGitDir = `${this.projectRootPath}/.git`
    let gitDir = `${this.projectRootPath}/.git`
    const gitDirStat = await fs.stat(vscode.Uri.file(gitDir)).catch(() => false)
    if (!gitDirStat) return "No Git repository"

    gitDir =
      gitDirStat.type & vscode.FileType.File
        ? (await readFile(gitDir)).replace("gitdir: ", "").trim()
        : defaultGitDir
    const headFilePath = `${gitDir}/HEAD`

    return (await readFile(headFilePath))
      .replace(/^(ref: refs\/heads\/\.*)/, "")
      .trim()
  }
}

const titleMarker = "${vscode-textmate}"

const activate = (context) => {
  // No open project, no Git repository.
  if (!vscode.workspace.workspaceFolders) return

  const updater = new WindowTitleUpdater(
    vscode.workspace.workspaceFolders[0].uri.path,
  )

  context.subscriptions.push(updater)
  vscode.workspace.onDidChangeConfiguration(
    async (event) => await updater.updateTitle(),
  )
}

module.exports = {
  activate,
}
