const vscode = require("vscode")

const separators = [
  "\n",
  " = ",
  " =",
  "=",
  "= ",
  " == ",
  " ==",
  "==",
  "== ",
  ", ",
]

const transposeSelection = (selection) => {
  const editor = vscode.window.activeTextEditor
  const document = editor.document

  if (selection.isEmpty) {
    const position = selection.start
    let before, after
    let currentLine = document.lineAt(position.line)
    let startOfLine = currentLine.range.start
    let endOfLine = currentLine.range.end


    if (selection.start.isEqual(startOfLine)) {
      // bail out if we're at the beginning of the document
      if (position.line === 0) return

      // swap with previous line
      before = document.lineAt(position.line - 1).range
      after = document.lineAt(position.line).range
    } else if (selection.start.isEqual(endOfLine)) {
      // swap with next line
      before = document.lineAt(position.line).range
      after = document.lineAt(position.line + 1).range
    } else { // swap previous and next character, emacs style
      // expand selection to include the character before and after
      before = new vscode.Range(
        position.with({ character: position.character - 1 }),
        position,
      )
      after = new vscode.Range(
        position,
        position.with({ character: position.character + 1 }),
      )
    }

    let textBefore = document.getText(before)
    let textAfter = document.getText(after)

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
