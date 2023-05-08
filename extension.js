const windowTitle = require("./src/windowTitle")
const bracketNavigation = require("./src/bracketNavigation")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Activating "vscode-textmate"...')
  windowTitle.activate(context)
  bracketNavigation.activate(context)
  console.log('"vscode-textmate" activated!')
}

// This method is called when your extension is deactivated
function deactivate() {
  console.log('Deactivating "vscode-textmate"...')
  windowTitle.deactivate()
  bracketNavigation.deactivate()
  console.log('"vscode-textmate" deactivated!')
}

module.exports = {
  activate,
  deactivate,
}
