const vscode = require("vscode")

const separators = ["\n", "=", ", "]

const transposeSelection = (selection) => {
  const editor = vscode.window.activeTextEditor
  const document = editor.document

  if (selection.isEmpty) {
    const position = selection.start
    let before, after

    if (selection.start.character === 0) {
      // bail out if we're at the beginning of the document
      if (position.line === 0) return

      // swap with previous line
      before = document.lineAt(position.line - 1).range
      after = document.lineAt(position.line).range
    } else if (selection.start.isEqual(document.lineAt(position).range.end)) {
      // swap with next line
      before = document.lineAt(position.line).range
      after = document.lineAt(position.line + 1).range
    }

    const textBefore = document.getText(before)
    const textAfter = document.getText(after)

    editor.edit((builder) => {
      builder.replace(before, textAfter)
      builder.replace(after, textBefore)
    })
  } else {
    const text = document.getText(selection)

    // if text contains any of "=", ", ", etc. swap sides of it
    const separator =
      separators.find((separator) => text.includes(separator)) || ""
    const parts = text.split(separator)

    editor.edit((builder) =>
      builder.replace(selection, parts.reverse().join(separator)),
    )
  }
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.transposeWords", () => {
      const editor = vscode.window.activeTextEditor
      const document = editor.document
      const selections = editor.selections

      if (selections.length === 1) {
        transposeSelection(editor.selection)
      } else {
        const texts = selections.map((selection) => document.getText(selection))
        texts.reverse()
        editor.edit((builder) =>
          selections.forEach((selection, index) =>
            builder.replace(selection, texts[index]),
          ),
        )
      }
    }),
  )
}

module.exports = {
  activate,
}
