// See https://github.com/aPinix/indent-jump-vscode for more information and LICENSING.

const vscode = require("vscode")
const BOUNDARY = /\S/

class IndentJumpMover {
  constructor(editor) {
    this.editor = editor
  }
  get currentLine() {
    return this.editor.selection.active.line
  }
  get currentIndent() {
    return this.editor.selection.active.character
  }

  moveUp() {
    this.move(this.findPreviousLine(this.currentLine, this.currentIndent))
  }
  moveDown() {
    this.move(this.findNextLine(this.currentLine, this.currentIndent))
  }
  selectUp() {
    let startPoint = this.editor.selection.anchor
    this.moveUp()
    let endPoint = this.editor.selection.active
    this.editor.selection = new vscode.Selection(startPoint, endPoint)
  }
  selectDown() {
    let startPoint = this.editor.selection.anchor
    this.moveDown()
    let endPoint = this.editor.selection.active
    this.editor.selection = new vscode.Selection(startPoint, endPoint)
  }
  move(toLine) {
    let position = this.editor.selection.active
    let newPosition = position.with(toLine, position.currentCharacter)
    let selection = new vscode.Selection(newPosition, newPosition)
    this.editor.selection = selection
    this.editor.revealRange(new vscode.Range(newPosition, newPosition))
  }
  indentJumpForLine(lineToCheck) {
    const line = this.editor.document.lineAt(lineToCheck)
    console.log({
      indentJumpForLine: lineToCheck,
      checking: line.firstNonWhitespaceCharacterIndex,
    })

    return line.firstNonWhitespaceCharacterIndex
  }
  emptyLine(lineNumber) {
    const line = this.editor.document.lineAt(lineNumber)
    return line.isEmptyOrWhitespace
  }

  hasBoundary(lineNumber, indent) {
    const line = this.editor.document.lineAt(lineNumber)
    return BOUNDARY.test(line.text.charAt(indent)) || BOUNDARY.test(line.text.charAt(indent - 1))
  }

  findNextLine(currentLine, currentIndent) {
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

  findPreviousLine(currentLine, currentIndent) {
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

  dispose() {}
}

function activate(context) {
  // move
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-textmate.moveToBeginningOfColumn",
      () => {
        const editor = vscode.window.activeTextEditor // has to be on all functions to catch the current active text editor
        if (editor) {
          new IndentJumpMover(editor).moveUp()
        }
      },
    ),
  )
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.moveToEndOfColumn", () => {
      const editor = vscode.window.activeTextEditor // has to be on all functions to catch the current active text editor
      if (editor) {
        new IndentJumpMover(editor).moveDown()
      }
    }),
  )
  // select
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-textmate.moveToBeginningOfColumnAndModifySelection",
      () => {
        const editor = vscode.window.activeTextEditor // has to be on all functions to catch the current active text editor
        if (editor) {
          new IndentJumpMover(editor).selectUp()
        }
      },
    ),
  )
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-textmate.moveToEndOfColumnAndModifySelection",
      () => {
        const editor = vscode.window.activeTextEditor // has to be on all functions to catch the current active text editor
        if (editor) {
          new IndentJumpMover(editor).selectDown()
        }
      },
    ),
  )
}

const deactivate = () => {}

module.exports = {
  activate,
  deactivate,
}
