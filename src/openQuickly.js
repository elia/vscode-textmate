const vscode = require("vscode")
const path = require("path")

function activate(context) {
  // Register a command to open a quick pick menu
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.openQuickly", async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders
      if (!workspaceFolders) {
        vscode.window.showErrorMessage("No workspace folders found.")
        return
      }
      const searchConfig = vscode.workspace.getConfiguration("search")
      const fileUris = await vscode.workspace.findFiles(
        "**/*",
        searchConfig.get("exclude"),
      )
      const items = fileUris.map((uri) => {
        const filePath = uri.fsPath
        const fileName = path.basename(filePath)
        const folderName = path.basename(path.dirname(filePath))
        return {
          label: fileName,
          description: folderName,
          uri,
        }
      })
      const selectedFiles = [await vscode.window.showQuickPick(items, {
        canPickMany: false,
      })]

      let activeEditorIndex = vscode.window.visibleTextEditors.findIndex(
        (editor) => editor.document === vscode.window?.activeTextEditor?.document,
      )
      console.log({ activeEditorIndex, selectedFiles })


      selectedFiles.forEach(async (selected) => {
        const alreadyOpen = vscode.window.visibleTextEditors.find(
          (editor) => editor.document.uri === selected.uri,
        )

        if (alreadyOpen) {
          vscode.window.showTextDocument(alreadyOpen.document)
        } else {
          const document = await vscode.workspace.openTextDocument(selected.uri)
          vscode.window.showTextDocument(document, { preview: false })
        }

        // let activeEditorIndex = 0 // vscode.window.tabGroups.activeTabGroup.indexOf(vscode.window.activeTextEditor)
        // vscode.window.showTextDocument(document)
        // vscode.commands.executeCommand('workbench.action.moveEditor', { to: 'right' });
        // const document = await vscode.workspace.openTextDocument(selected.uri)
        // const viewColumn = activeEditor
        //   ? activeEditor.viewColumn + 1
        //   : vscode.ViewColumn.One

        // vscode.window.showTextDocument(document, { preview: false })
        console.log({ activeEditorIndex })
        vscode.commands.executeCommand("moveActiveEditor", {
          to: "position",
          by: "tab",
          value: activeEditorIndex++,
        })
      })
    }),
  )
}

const deactivate = () => {}

module.exports = {
  activate,
  deactivate,
}
