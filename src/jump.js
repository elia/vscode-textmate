const vscode = require("vscode")

const activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-textmate.jumpToSelection",
      async () => {
        const selection = vscode.window.activeTextEditor.selection
        const [start, end] = [selection.start.line, selection.end.line].sort()
        const lineNumber = Math.round(start + (end - start) / 2)
        await vscode.commands.executeCommand("revealLine", {lineNumber, at: "center"})
      },
    ),
  )
}

const deactivate = () => {}

module.exports = {
  activate,
  deactivate,
}
