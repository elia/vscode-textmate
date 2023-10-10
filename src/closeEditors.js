const vscode = require("vscode")

const activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.closeOtherEditors", () => {
      vscode.window.tabGroups.all.forEach((group) => {
        group.tabs.forEach((tab) => {
          if (tab.isActive || tab.isDirty || tab.isPinned) return
          const preserveFocus = true
          vscode.window.tabGroups.close(tab, preserveFocus)
        })
      })
    })
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "vscode-textmate.closeEditorInAllGroups",
      () => {
        vscode.window.tabGroups.all.forEach((group) => {
          group.tabs.forEach((tab) => {
            if (tab.isDirty || tab.isPinned) return
            const preserveFocus = false
            vscode.window.tabGroups.close(tab, preserveFocus)
          })
        })
      },
    ),
  )
}

module.exports = {
  activate,
}
