// See https://github.com/zigapeda/open-project-folder for more information and LICENSING.

const fs = require("fs/promises")
const path = require("path")
const {
  window,
  commands,
  workspace,
  Uri,
  ThemeIcon,
  QuickPickItemKind,
} = require("vscode")

const ADD = "$(add) Add Project Folder"

const expandFolders = async (folders) => {
  const expanded = await Promise.all(
    folders.map(async (folder) => {
      if ((await fs.stat(folder)).isDirectory()) {
        let files = await fs.readdir(folder, { withFileTypes: true })
        files = files.filter((file) => file.isDirectory())
        return files.map((file) => path.join(folder, file.name))
      }
      return folder
    }),
  )
  return expanded.flat()
}

const activate = (context) => {
  context.subscriptions.push(
    commands.registerCommand("vscode-textmate.openProject", async () => {
      const settings = workspace.getConfiguration("vscode-textmate")

      const currentFolders =
        workspace?.workspaceFolders?.map((f) => f.uri?.path) || []
      let recentFolders = (
        context.globalState.get("recentFolders") || []
      ).filter((p) => !currentFolders.includes(p))

      const iconPath = new ThemeIcon("folder")

      const favoritesFolders = (
        await expandFolders(settings.get("projectFolders") || [])
      )
        .flat()
        .filter((p) => !recentFolders.includes(p))
        .filter((p) => !currentFolders.includes(p))
        .sort((a, b) =>
          path
            .basename(a)
            .toLowerCase()
            .localeCompare(path.basename(b).toLowerCase()),
        )

      const items = []
      const addItems = (label, pathnames) => {
        if (pathnames.length === 0) return
        items.push({ label, kind: QuickPickItemKind.Separator })
        pathnames.forEach((pathname) =>
          items.push({
            label: path.basename(pathname),
            description: path.dirname(pathname),
            pathname,
            iconPath,
          }),
        )
      }

      addItems("Recent", recentFolders)
      addItems("Favorites", favoritesFolders)
      addItems("Current", currentFolders)

      items.push({ label: ADD })
      console.debug({ recentFolders, favoritesFolders, currentFolders })

      const pick = await window.showQuickPick(items, {
        title: "Open Recent Project",
        matchOnDescription: true,
        matchOnDetail: true,
        canSelectMany: true,
      })

      if (!pick) return

      console.debug({ pick })

      if (pick.label === ADD) {
        const newFolder = await window.showOpenDialog({
          canSelectFiles: false,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: "Add",
          title: "Add a project folder",
          placeholder: "Search",
        })
        if (newFolder) {
          folders.push(newFolder[0].fsPath)
          settings.update("projectFolders", folders, true)
        }
      } else if (pick.pathname) {
        const pathname = pick.pathname //path.join(pick.detail, pick.label)
        recentFolders = recentFolders.filter((x, i) => x !== pathname && i < 10)
        recentFolders.push(pathname)
        context.globalState.update("recentFolders", recentFolders)

        const uri = Uri.file(pathname)
        if (!workspace.workspaceFolders) {
          commands.executeCommand("vscode.openFolder", uri)
        } else {
          commands.executeCommand("vscode.openFolder", uri, {
            forceNewWindow: true,
          })
        }
      }
    }),
  )

  if (!workspace.workspaceFolders) {
    commands.executeCommand("vscode-textmate.openProject")
  }
}

module.exports = {
  activate,
}
