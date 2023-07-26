const features = [
  require("./src/windowTitle"),
  require("./src/bracketNavigation"),
  require("./src/closeEditors"),
]

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  console.log('Activating "vscode-textmate"...')
  features.forEach((feature) => { feature.activate(context) })
  console.log('"vscode-textmate" activated!')
}

// This method is called when your extension is deactivated
function deactivate() {
  console.log('Deactivating "vscode-textmate"...')
  features.forEach((feature) => { feature.deactivate() })
  console.log('"vscode-textmate" deactivated!')
}

module.exports = {
  activate,
  deactivate,
}
