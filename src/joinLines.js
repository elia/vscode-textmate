const vscode = require("vscode")

const activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.joinLines", async () => {
      const editor = vscode.window.activeTextEditor
      const document = editor.document
      const text = document.getText()
      const whitespace = /([\n\r]\s*)/

      editor.selections = editor.selections.map((selection) => {
        const offset = document.offsetAt(selection.end)
        let subset = text.slice(offset)
        const match = whitespace.exec(subset)
        if (!match) return new vscode.Selection(end, end)

        const startOffset = offset + match.index
        const endOffset = offset + match.index + match[0].length
        const start = document.positionAt(startOffset)
        const end = document.positionAt(endOffset)

        const range = new vscode.Range(start, end)
        editor.edit((builder) => builder.delete(range))
        return new vscode.Selection(start, start)
      })
    }),
  )
}

module.exports = {
  activate,
}
