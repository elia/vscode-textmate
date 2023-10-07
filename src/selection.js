// See https://github.com/aPinix/indent-jump-vscode for more information and LICENSING.

const vscode = require("vscode")
const BOUNDARY = /\S/
const OPENING = ["(", "[", "{"]
const CLOSING = [")", "]", "}"]


class Selection {
  moveToBeginningOfColumn() {
    const line = this.findPreviousLine(this.currentLine, this.currentIndent)
    this.moveTo(this.editor.selection.active.with({ line }))
  }
  moveToEndOfColumn() {
    const line = this.findNextLine(this.currentLine, this.currentIndent)
    this.moveTo(this.editor.selection.active.with({ line }))
  }
  moveToBeginningOfColumnAndModifySelection() {
    const line = this.findPreviousLine(this.currentLine, this.currentIndent)
    this.selectTo(this.editor.selection.active.with({ line }))
  }
  moveToEndOfColumnAndModifySelection() {
    const line = this.findNextLine(this.currentLine, this.currentIndent)
    this.selectTo(this.editor.selection.active.with({ line }))
  }
  moveToBeginningOfBlock() {
    this.moveTo(this.findNextOpenBracketPosition())
  }
  moveToEndOfBlock() {
    this.moveTo(this.findNextClosedBracketPosition())
  }
  moveToBeginningOfBlockAndModifySelection() {
    this.selectTo(this.findNextOpenBracketPosition())
  }
  moveToEndOfBlockAndModifySelection() {
    this.selectTo(this.findNextClosedBracketPosition())
  }

  // private

  constructor(editor) {
    this.editor = editor
  }

  moveTo(position) {
    if (!position) return

    this.editor.selection = new vscode.Selection(position, position)
    this.editor.revealRange(new vscode.Range(position, position))
  }

  selectTo(position) {
    if (!position) return

    const anchor = this.editor.selection.anchor
    this.editor.selection = new vscode.Selection(anchor, position)
    this.editor.revealRange(new vscode.Range(position, position))
  }

  // column

  hasBoundary(lineNumber, indent) {
    const line = this.editor.document.lineAt(lineNumber)
    return (
      BOUNDARY.test(line.text.charAt(indent)) ||
      BOUNDARY.test(line.text.charAt(indent - 1))
    )
  }

  findNextLine() {
    const currentLine = this.editor.selection.active.line
    const currentIndent = this.editor.selection.active.character
    const endLine = this.editor.document.lineCount - 1 // from 1-based to 0-based

    if (currentLine === endLine) return

    if (this.hasBoundary(currentLine + 1, currentIndent)) {
      // find the last line with a boundary
      for (let line = currentLine + 1; line <= endLine; line++) {
        if (!this.hasBoundary(line, currentIndent)) return line - 1
      }
    } else {
      // find next line with a boundary
      for (let line = currentLine + 1; line <= endLine; line++) {
        if (this.hasBoundary(line, currentIndent)) return line
      }
    }
    return endLine
  }

  findPreviousLine() {
    const currentLine = this.editor.selection.active.line
    const currentIndent = this.editor.selection.active.character
    const firstLine = 0 // 0-based

    if (currentLine === firstLine) return

    if (this.hasBoundary(currentLine - 1, currentIndent)) {
      // find the last line with a boundary going up
      for (let line = currentLine - 1; line >= firstLine; line--) {
        if (!this.hasBoundary(line, currentIndent)) return line + 1
      }
    } else {
      // find the first line with a boundary going up
      for (let line = currentLine - 1; line >= firstLine; line--) {
        if (this.hasBoundary(line, currentIndent)) return line
      }
    }
    return firstLine
  }

  // block

  findNextOpenBracketPosition() {
    let pos = this.editor.selection.active
    let doc = this.editor.document
    let bracketsStack = []
    let offset = doc.offsetAt(pos)

    if (OPENING.indexOf(doc.getText().charAt(offset - 1)) != -1) {
      offset-- // if we're next to an open bracket, start from the previous character
    }

    while (offset > 0) {
      let char = doc.getText().charAt(offset - 1)

      if (OPENING.indexOf(char) != -1) {
        let lastBracket = bracketsStack[bracketsStack.length - 1]

        if (CLOSING.indexOf(lastBracket) != OPENING.indexOf(char)) {
          return doc.positionAt(offset)
        } else {
          bracketsStack.pop() // matching a closed bracket we already encountered
        }
      } else if (CLOSING.indexOf(char) != -1) {
        bracketsStack.push(char)
      }

      offset--
    }
  }

  findNextClosedBracketPosition() {
    let pos = this.editor.selection.active
    let doc = this.editor.document
    let bracketsStack = []
    let offset = doc.offsetAt(pos)
    const length = doc.getText().length

    if (CLOSING.indexOf(doc.getText().charAt(offset)) != -1) {
      offset++ // if we're next to a clsing bracket, start from the next character
    }

    while (offset < length) {
      let char = doc.getText().charAt(offset)

      if (CLOSING.indexOf(char) != -1) {
        let lastBracket = bracketsStack[bracketsStack.length - 1]

        if (OPENING.indexOf(lastBracket) != CLOSING.indexOf(char)) {
          return doc.positionAt(offset)
        } else {
          bracketsStack.pop() // matching an open bracket we already encountered
        }
      } else if (OPENING.indexOf(char) != -1) {
        bracketsStack.push(char)
      }

      offset++
    }
  }
}

function activate(context) {
  ;[
    "moveToBeginningOfColumn",
    "moveToEndOfColumn",
    "moveToBeginningOfColumnAndModifySelection",
    "moveToEndOfColumnAndModifySelection",
    "moveToBeginningOfBlock",
    "moveToEndOfBlock",
    "moveToBeginningOfBlockAndModifySelection",
    "moveToEndOfBlockAndModifySelection",
  ].forEach((command) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(`vscode-textmate.${command}`, () => {
        // has to be on all functions to catch the current active text editor
        const editor = vscode.window.activeTextEditor
        if (editor) new Selection(editor)[command]()
      }),
    )
  })
}

module.exports = {
  activate,
}
