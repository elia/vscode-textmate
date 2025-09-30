let vscode = require("vscode")
let path = require("path")

let gatherWorkspaceFiles = async () => {
  if (!vscode.workspace.workspaceFolders?.length) return []

  let allFiles = []
  let excludePattern = vscode.workspace.getConfiguration("files").get("exclude", {})
  let searchExcludePattern = vscode.workspace.getConfiguration("search").get("exclude", {})

  // Build exclude patterns
  let excludePatterns = {
    ...excludePattern,
    ...searchExcludePattern,
    "**/node_modules/**": true,
    "**/.git/**": true,
    "**/tmp/**": true,
    "**/temp/**": true,
    "**/*.log": true,
  }

  for (let workspaceFolder of vscode.workspace.workspaceFolders) {
    try {
      let files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceFolder, "**/*"),
        new vscode.RelativePattern(workspaceFolder, `{${Object.keys(excludePatterns).join(",")}}`),
        5000 // limit to prevent performance issues
      )

      let workspaceFiles = files
        .filter(uri => uri.scheme === "file")
        .map(uri => {
          let relativePath = vscode.workspace.asRelativePath(uri)
          return {
            label: path.basename(uri.path),
            description: path.dirname(relativePath),
            uri: uri,
            relativePath: relativePath,
          }
        })
        .sort((a, b) => a.label.localeCompare(b.label))

      allFiles.push(...workspaceFiles)
    } catch (error) {
      console.error("Error gathering workspace files:", error)
    }
  }

  return allFiles
}

let activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.openQuickly", async () => {
      let files = await gatherWorkspaceFiles()

      if (files.length === 0) {
        vscode.window.showInformationMessage("No files found in workspace")
        return
      }

      let picks = await vscode.commands.executeCommand(
        "vscode-textmate.showSelectFromList",
        files,
        {
          title: "Open Quickly…",
          renderAs: "panel",
          limitFilteredResults: 50,
        }
      )

      for (let pick of picks || []) {
        if (pick?.uri) {
          await vscode.window.showTextDocument(pick.uri)
        }
      }
    })
  )
}

module.exports = {
  activate,
}
