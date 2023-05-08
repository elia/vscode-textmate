const windowTitle = require("./src/windowTitle")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Activating "vscode-textmate"...')
  windowTitle.activate(context)
  console.log('"vscode-textmate" activated!')
}

// This method is called when your extension is deactivated
function deactivate() {
  console.log('Deactivating "vscode-textmate"...')
  windowTitle.deactivate()
  console.log('"vscode-textmate" deactivated!')
}

module.exports = {
  activate,
  deactivate,
}
