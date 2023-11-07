// See https://github.com/zigapeda/open-project-folder for more information and LICENSING.

const path = require("path")
const vscode = require("vscode")

const fs = vscode.workspace.fs

const ADD_CONTAINING_FOLDER = "$(add) Add Projects Containing Folder"
const ADD_FOLDER = "$(add) Add Project Folder"

const expandDirEntries = async (folders) => {
  const expanded = await Promise.all(
    folders.map(async (folder) => {
      if (folder.startsWith("[DIR] ")) {
        folder = folder.slice(6) // remove "[DIR] "
        folder = vscode.Uri.file(folder)
        const stat = await fs.stat(folder)
        try {
          if (stat.type === vscode.FileType.Directory) {
            let files = await fs.readDirectory(folder)
            files = files.filter(([fileName, _]) => !fileName.startsWith("."))
            return files.map(([fileName, _]) => path.join(folder.fsPath, fileName))
          }
        } catch(e) {
          console.error(folder)
          console.error(e)
        }
      }
      return folder
    }),
  )
  return expanded.flat()
}

const activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.openProject", async () => {
      const settings = vscode.workspace.getConfiguration("vscode-textmate")

      const currentFolders =
        vscode.workspace?.workspaceFolders?.map((f) => f.uri?.path) || []
      currentFolders.concat(settings.get("favorites") || [])
      let recentFolders = (context.globalState.get("recentFolders") || [])
        .filter((p) => !currentFolders.includes(p))
        .reverse()

      const iconPath = new vscode.ThemeIcon("folder")

      const favorites = (
        await expandDirEntries(settings.get("favorites") || [])
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
        items.push({ label, kind: vscode.QuickPickItemKind.Separator })
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
      addItems("Favorites", favorites)
      addItems("Current", currentFolders)

      items.push({ label: ADD_CONTAINING_FOLDER })
      items.push({ label: ADD_FOLDER })
      console.debug({ recentFolders, favorites, currentFolders })

      const pick = await vscode.window.showQuickPick(items, {
        title: "Open Recent Project",
        matchOnDescription: true,
        matchOnDetail: true,
        canSelectMany: true,
      })

      if (!pick) return

      console.debug({ pick })

      if (pick.label === ADD_CONTAINING_FOLDER || pick.label === ADD_FOLDER) {
        const newFolder = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: "Add",
          title: "Add folder",
          placeholder: "Search",
        })
        if (newFolder && newFolder[0].scheme === "file") {
          const fsPath = newFolder[0].fsPath
          settings.update(
            "favorites",
            (settings.get("favorites") || []).concat(
              pick.label === ADD_FOLDER ? fsPath : `[DIR] ${fsPath}`,
            ),
            true,
          )
        }
      } else if (pick.pathname) {
        const pathname = pick.pathname
        recentFolders = recentFolders.filter((x, i) => x !== pathname && i < 10)
        recentFolders.push(pathname)
        context.globalState.update("recentFolders", recentFolders)

        const uri = vscode.Uri.file(pathname)
        if ((await fs.stat(uri)).type === vscode.FileType.Directory) {
          vscode.commands.executeCommand("vscode.openFolder", uri, {
            // open in new window if workspace has folders
            forceNewWindow: vscode.workspace.workspaceFolders,
          })
        } else {
          vscode.commands.executeCommand("vscode.open", uri)
        }
      }
    }),
  )

  if (
    !vscode.workspace.workspaceFolders &&
    !vscode.window.tabGroups.activeTabGroup?.tabs?.length
  ) {
    vscode.commands.executeCommand("vscode-textmate.openProject")
  }
}

module.exports = {
  activate,
}
