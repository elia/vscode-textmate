const vscode = require("vscode")

const activate = (context) => {
  const disposable = vscode.commands.registerCommand(
    "vscode-textmate.closeOtherEditors",
    () => {
      vscode.window.tabGroups.all.forEach((group) => {
        group.tabs.forEach((tab) => {
          if (tab.isActive || tab.isDirty || tab.isPinned) return
          const preserveFocus = true
          vscode.window.tabGroups.close(tab, preserveFocus)
        })
      })
    },
  )

  context.subscriptions.push(disposable)
}

const deactivate = () => {}

module.exports = {
  activate,
  deactivate,
}
