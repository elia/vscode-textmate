const vscode = require("vscode")

function activate(context) {
  let command = vscode.commands.registerCommand("vscode-textmate.copyToFindPasteboard", function () {
    let editor = vscode.window.activeTextEditor
    if (!editor) {
      return
    }

    let selectedText = editor.document.getText(editor.selection)
    if (!selectedText) {
      return
    }

    vscode.commands.executeCommand('actions.findWithSelection')

    try {
      const pasteboard = require("macos-pasteboard")
      pasteboard.writeText(selectedText, "find")
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to copy to find pasteboard: ${error.message}`)
    }
  })

  context.subscriptions.push(command)
}

module.exports = { activate }
