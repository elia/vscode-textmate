const vscode = require("vscode")

// Prompts the user to pick a workspace folder when multiple roots are open.
// Returns the single folder URI directly when there's only one, or undefined
// if the user cancels the picker.
async function pickWorkspaceFolder() {
  let folders = vscode.workspace.workspaceFolders

  if (!folders?.length) return undefined
  if (folders.length === 1) return folders[0]

  let pick = await vscode.window.showQuickPick(
    folders.map((folder) => ({ label: folder.name, folder })),
    { placeHolder: "Select workspace folder" }
  )

  return pick?.folder
}

module.exports = { pickWorkspaceFolder }
