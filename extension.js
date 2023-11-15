const features = [
  require("./src/openProject"),
  require("./src/selection"),
  require("./src/windowTitle"),
  require("./src/closeEditors"),
  require("./src/jump"),
  require("./src/joinLines"),
]

function activate(context) {
  console.log("[vscode-textmate] activating...")
  features.forEach((feature) => { feature.activate(context) })
  console.log('[vscode-textmate] activated!')
}

function deactivate() {
  console.log('[vscode-textmate] deactivating...')
  features.forEach((feature) => { if (feature.deactivate) feature.deactivate() })
  console.log('[vscode-textmate] deactivated!')
}

module.exports = {
  activate,
  deactivate,
}
