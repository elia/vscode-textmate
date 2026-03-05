let vscode = require("vscode")

let foldState = new Map()

function computeFoldDepths(ranges) {
  let sorted = [...ranges].sort((a, b) =>
    a.start - b.start || b.end - a.end
  )

  let depthMap = new Map()
  let stack = []

  for (let range of sorted) {
    while (stack.length > 0 && stack[stack.length - 1] < range.start) {
      stack.pop()
    }
    depthMap.set(range.start, stack.length + 1)
    stack.push(range.end)
  }

  return depthMap
}

let activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.foldAtDepth", async (args) => {
      let editor = vscode.window.activeTextEditor
      if (!editor) return

      let depth = args?.depth
      if (depth === undefined) {
        let input = await vscode.window.showInputBox({
          prompt: "Fold depth (0 = fold all, 1 = unfold top level, 2 = unfold deeper, …)",
          placeHolder: "0",
        })
        if (input === undefined) return
        depth = parseInt(input, 10)
        if (isNaN(depth) || depth < 0) return
      }

      let uriKey = editor.document.uri.toString()
      let currentDepth = foldState.get(uriKey) ?? -1

      if (depth === currentDepth) {
        if (depth === 0) {
          await vscode.commands.executeCommand("editor.unfoldAll")
        } else {
          await vscode.commands.executeCommand("editor.foldAll")
        }
        foldState.set(uriKey, -1)
        return
      }

      if (depth === 0) {
        await vscode.commands.executeCommand("editor.foldAll")
        foldState.set(uriKey, 0)
        return
      }

      let ranges = await vscode.commands.executeCommand(
        "vscode.executeFoldingRangeProvider", editor.document.uri
      )
      if (!ranges || ranges.length === 0) return

      let depthMap = computeFoldDepths(ranges)

      await vscode.commands.executeCommand("editor.foldAll")

      for (let level = 1; level <= depth; level++) {
        let linesAtLevel = []
        for (let [line, d] of depthMap) {
          if (d === level) linesAtLevel.push(line)
        }
        if (linesAtLevel.length > 0) {
          await vscode.commands.executeCommand("editor.unfold", {
            selectionLines: linesAtLevel,
            levels: 1,
          })
        }
      }

      foldState.set(uriKey, depth)
    })
  )
}

module.exports = { activate }
