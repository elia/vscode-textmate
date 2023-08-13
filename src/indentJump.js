// See https://github.com/aPinix/indent-jump-vscode for more information and LICENSING.

const vscode = require("vscode")

class IndentJumpMover {
  constructor(editor) {
    this.editor = editor
  }
  get currentLineNumber() {
    return this.editor.selection.active.line
  }
  get currentLevel() {
    return this.editor.selection.active.character
  }

  moveUp() {
    this.move(
      this.findPreviousLine(this.currentLineNumber, this.currentLevel),
    )
  }
  moveDown() {
    this.move(
      this.findNextLine(this.currentLineNumber, this.currentLevel)
    )
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
    let currentCharacter = this.editor.selection.anchor.character
    let position = this.editor.selection.active
    let newPosition = position.with(toLine, currentCharacter)
    let selection = new vscode.Selection(newPosition, newPosition)
    this.editor.selection = selection
    this.editor.revealRange(new vscode.Range(newPosition, newPosition))
  }
  indentJumpForLine(lineToCheck) {
    const line = this.editor.document.lineAt(lineToCheck)
    console.log({ checking: line.firstNonWhitespaceCharacterIndex })

    return line.firstNonWhitespaceCharacterIndex
  }
  emptyLine(lineNumber) {
    const line = this.editor.document.lineAt(lineNumber)
    return line.isEmptyOrWhitespace
  }
  findNextLine(currentLineNumber, currentIndentJump) {
    const endLineNumber = this.editor.document.lineCount - 1
    if (currentLineNumber === endLineNumber) return
    const nextLineNumber = currentLineNumber + 1
    const jumpingOverSpace =
      this.indentJumpForLine(nextLineNumber) !== currentIndentJump ||
      this.emptyLine(nextLineNumber)
    for (
      let lineNumber = nextLineNumber;
      lineNumber <= endLineNumber;
      lineNumber++
    ) {
      let indentationForLine = this.indentJumpForLine(lineNumber)
      if (
        jumpingOverSpace &&
        indentationForLine === currentIndentJump &&
        !this.emptyLine(lineNumber)
      ) {
        return lineNumber
      } else if (
        !jumpingOverSpace &&
        (indentationForLine !== currentIndentJump || this.emptyLine(lineNumber))
      ) {
        return lineNumber - 1
      } else if (
        !jumpingOverSpace &&
        indentationForLine === currentIndentJump &&
        lineNumber === endLineNumber
      ) {
        return lineNumber
      }
    }
    return
  }
  findPreviousLine(currentLineNumber, currentIndentJump) {
    if (currentLineNumber === 0) return
    const previousLineNumber = currentLineNumber - 1
    const jumpingOverSpace =
      this.indentJumpForLine(previousLineNumber) !== currentIndentJump ||
      this.emptyLine(previousLineNumber)
    for (let lineNumber = previousLineNumber; lineNumber >= 0; lineNumber--) {
      let indentationForLine = this.indentJumpForLine(lineNumber)
      if (
        jumpingOverSpace &&
        indentationForLine === currentIndentJump &&
        !this.emptyLine(lineNumber)
      ) {
        return lineNumber
      } else if (
        !jumpingOverSpace &&
        (indentationForLine !== currentIndentJump || this.emptyLine(lineNumber))
      ) {
        return lineNumber + 1
      } else if (
        !jumpingOverSpace &&
        indentationForLine === currentIndentJump &&
        lineNumber === 0
      ) {
        return lineNumber
      }
    }
    return
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
    vscode.commands.registerCommand("vscode-textmate.moveToEndOfColumn",
    () => {
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
