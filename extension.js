const windowTitle = require("./src/windowTitle")

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Congratulations, your extension "tmcode" is now active!')
  return windowTitle.activate(context)
}

// This method is called when your extension is deactivated
function deactivate() {
  console.log('Deactivating "tmcode"...')
  return windowTitle.deactivate(context)
}

module.exports = {
  activate,
  deactivate,
}
