const features = [
  require("./src/windowTitle"),
  require("./src/bracketNavigation"),
  require("./src/closeEditors"),
  require("./src/openProject"),
  require("./src/indentJump"),
]

function activate(context) {
  console.log("[vscode-textmate] activating...")
  features.forEach((feature) => { feature.activate(context) })
  console.log('[vscode-textmate] activated!')
}

function deactivate() {
  console.log('[vscode-textmate] deactivating...')
  features.forEach((feature) => { feature.deactivate() })
  console.log('[vscode-textmate] deactivated!')
}

module.exports = {
  activate,
  deactivate,
}
