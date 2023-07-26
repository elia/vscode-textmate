const windowTitle = require("./src/windowTitle")
const bracketNavigation = require("./src/bracketNavigation")
const closeEditors = require("./src/closeEditors")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Activating "vscode-textmate"...')
  windowTitle.activate(context)
  bracketNavigation.activate(context)
  closeEditors.activate(context)
  console.log('"vscode-textmate" activated!')
}

// This method is called when your extension is deactivated
function deactivate() {
  console.log('Deactivating "vscode-textmate"...')
  windowTitle.deactivate()
  bracketNavigation.deactivate()
  closeEditors.deactivate()
  console.log('"vscode-textmate" deactivated!')
}

module.exports = {
  activate,
  deactivate,
}
