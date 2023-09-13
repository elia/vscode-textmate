const vs = require("vscode")

let OPENING = ["(", "[", "{"]
let CLOSING = [")", "]", "}"]

function moveToBeginningOfBlock() {
  let editor = vs.window.activeTextEditor
  moveTo(editor, findNextOpenBracketPosition(editor))
}

function moveToEndOfBlock() {
  let editor = vs.window.activeTextEditor
  moveTo(editor, findNextClosedBracketPosition(editor))
}

function moveToBeginningOfBlockAndModifySelection() {
  let editor = vs.window.activeTextEditor
  selectTo(editor, findNextOpenBracketPosition(editor))
}

function moveToEndOfBlockAndModifySelection() {
  console.log("moveToEndOfBlockAndModifySelection")
  let editor = vs.window.activeTextEditor
  selectTo(editor, findNextClosedBracketPosition(editor))
}

function moveTo(editor, position) {
  if (!position) return

  editor.selection = new vs.Selection(position, position)
  editor.revealRange(new vs.Range(position, position))
}

function selectTo(editor, position) {
  if (!position) return

  let anchorPos = editor.selection.anchor

  editor.selection = new vs.Selection(anchorPos, position)
  editor.revealRange(new vs.Range(position, position))
}

function findNextOpenBracketPosition(editor) {
  let pos = editor.selection.active
  let doc = editor.document
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

function findNextClosedBracketPosition(editor) {
  let pos = editor.selection.active
  let doc = editor.document
  let bracketsStack = []
  let offset = doc.offsetAt(pos)
  length = doc.getText().length

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

function activate(context) {
  context.subscriptions.push(
    vs.commands.registerCommand(
      "vscode-textmate.moveToBeginningOfBlock",
      moveToBeginningOfBlock,
    ),
    vs.commands.registerCommand(
      "vscode-textmate.moveToEndOfBlock",
      moveToEndOfBlock,
    ),
    vs.commands.registerCommand(
      "vscode-textmate.moveToBeginningOfBlockAndModifySelection",
      moveToBeginningOfBlockAndModifySelection,
    ),
    vs.commands.registerCommand(
      "vscode-textmate.moveToEndOfBlockAndModifySelection",
      moveToEndOfBlockAndModifySelection,
    ),
  )
}

module.exports = {
  activate,
}
