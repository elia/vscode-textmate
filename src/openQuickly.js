let vscode = require("vscode")
let path = require("path")

// Track recently viewed files
let maxRecentFiles = 10

let trackRecentFile = (context, uri) => {
  if (!uri || uri.scheme !== "file") return

  let recentFilesKey = "recentFiles"
  let stored = context.workspaceState.get(recentFilesKey, [])

  // Remove if already exists to avoid duplicates
  stored = stored.filter((item) => item.path !== uri.path)

  // Add to front
  stored.unshift({
    path: uri.path,
    relativePath: vscode.workspace.asRelativePath(uri),
    lastOpened: Date.now(),
  })

  // Keep only maxRecentFiles
  stored = stored.slice(0, maxRecentFiles)

  context.workspaceState.update(recentFilesKey, stored)
}

let getRecentFiles = (context, excludeCurrentActive = true) => {
  let recentFilesKey = "recentFiles"
  let stored = context.workspaceState.get(recentFilesKey, [])

  // Get current active editor path to exclude
  let currentPath =
    excludeCurrentActive && vscode.window.activeTextEditor?.document.uri.path
  let currentItem = stored.find((item) => item.path === currentPath)

  // Filter out files that no longer exist and optionally the current active file
  return stored
    .filter((item) => {
      if (currentPath && item.path === currentPath) return false
      try {
        return require("fs").existsSync(item.path)
      } catch {
        return false
      }
    }).concat(currentItem ? [currentItem] : [])
    .map((item) => ({
      label: path.basename(item.path),
      description: item.relativePath,
      detail: `Last opened: ${new Date(item.lastOpened).toLocaleString()}`,
      uri: vscode.Uri.file(item.path),
      relativePath: item.relativePath,
      isRecent: true,
    }))
}

let gatherWorkspaceFiles = async () => {
  if (!vscode.workspace.workspaceFolders?.length) return []

  let allFiles = []
  let excludePattern = vscode.workspace
    .getConfiguration("files")
    .get("exclude", {})
  let searchExcludePattern = vscode.workspace
    .getConfiguration("search")
    .get("exclude", {})

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
        new vscode.RelativePattern(
          workspaceFolder,
          `{${Object.keys(excludePatterns).join(",")}}`,
        ),
        5000, // limit to prevent performance issues
      )

      let workspaceFiles = files
        .filter((uri) => uri.scheme === "file")
        .map((uri) => {
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

let parseRange = (text) => {
  let [line, column] = text.split(":", 2).map((n) => parseInt(n, 10))
  if (isNaN(line)) line = 1
  if (isNaN(column)) column = 1
  if (line < 1) line = 1
  if (column < 1) column = 1
  return new vscode.Position(line - 1, column - 1)
}

let activate = (context) => {
  // Track when active editor changes (not just when files are opened)
  let disposable = vscode.window.onDidChangeActiveTextEditor((editor) => {
    if (editor?.document.uri) {
      trackRecentFile(context, editor.document.uri)
    }
  })
  context.subscriptions.push(disposable)

  // Track current active editor on startup
  if (vscode.window.activeTextEditor) {
    trackRecentFile(context, vscode.window.activeTextEditor.document.uri)
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.openQuickly", async () => {
      let recentFiles = getRecentFiles(context)
      let workspaceFiles = await gatherWorkspaceFiles()

      // Combine recent files with workspace files, avoiding duplicates
      let recentFilePaths = new Set(recentFiles.map((f) => f.uri.path))
      let otherFiles = workspaceFiles.filter(
        (f) => !recentFilePaths.has(f.uri.path),
      )

      let allFiles = [...recentFiles, ...otherFiles]

      if (allFiles.length === 0) {
        vscode.window.showInformationMessage("No files found in workspace")
        return
      }

      // If clipboard contains a valid file path, it will be the initial filter text
      let currentClipboard = await vscode.env.clipboard.readText()
      let initialFilter = currentClipboard ? currentClipboard.trim() : ""

      let picks = await vscode.commands.executeCommand(
        "vscode-textmate.showSelectFromList",
        allFiles,
        {
          title: "Open Quickly…",
          renderAs: "panel",
          // limitFilteredResults: 50,
          initialFilter,
        },
      )

      for (let pick of picks || []) {
        if (pick?.uri) {
          let editor = await vscode.window.showTextDocument(pick.uri)
          if (picks.range) {
            let pos = parseRange(picks.range)
            console.log("Navigating to range:", picks.range, pos)
            editor.selection = new vscode.Selection(pos, pos)
            editor.revealRange(
              new vscode.Range(pos, pos),
              vscode.TextEditorRevealType.InCenter,
            )
          }
        }
      }
    }),
  )
}

module.exports = {
  activate,
}
