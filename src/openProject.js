// See https://github.com/zigapeda/open-project-folder for more information and LICENSING.

let path = require("path")
let vscode = require("vscode")

let fs = vscode.workspace.fs

let ADD_CONTAINING_FOLDER = "$(add) Add Projects Containing Folder"
let ADD_FOLDER = "$(add) Add Project Folder"

let expandDirEntries = async (folders) => {
  let expanded = await Promise.all(
    folders.map(async (folder) => {
      if (folder.startsWith("[DIR] ")) {
        folder = folder.slice(6) // remove "[DIR] "
        folder = vscode.Uri.file(folder)
        let stat = await fs.stat(folder)
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

let activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.openProject", async () => {
      let settings = vscode.workspace.getConfiguration("vscode-textmate")

      let currentFolders =
        vscode.workspace?.workspaceFolders?.map((f) => f.uri?.path) || []
      currentFolders.concat(settings.get("favorites") || [])
      let recentFolders = (context.globalState.get("recentFolders") || [])
        .filter((p) => !currentFolders.includes(p))
        .reverse()

      let iconPath = new vscode.ThemeIcon("folder")

      let favorites = (
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

      let items = []
      let addItems = (label, pathnames) => {
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

      let pick = await vscode.window.showQuickPick(items, {
        title: "Open Recent Project",
        matchOnDescription: true,
        matchOnDetail: true,
        canSelectMany: true,
      })

      if (!pick) return

      console.debug({ pick })

      if (pick.label === ADD_CONTAINING_FOLDER || pick.label === ADD_FOLDER) {
        let newFolder = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectFolders: true,
          canSelectMany: false,
          openLabel: "Add",
          title: "Add folder",
          placeholder: "Search",
        })
        if (newFolder && newFolder[0].scheme === "file") {
          let fsPath = newFolder[0].fsPath
          settings.update(
            "favorites",
            (settings.get("favorites") || []).concat(
              pick.label === ADD_FOLDER ? fsPath : `[DIR] ${fsPath}`,
            ),
            true,
          )
        }
      } else if (pick.pathname) {
        let pathname = pick.pathname
        recentFolders = recentFolders.filter((x, i) => x !== pathname && i < 10)
        recentFolders = [...recentFolders, pathname]

        context.globalState.update("recentFolders", recentFolders)

        let uri = vscode.Uri.file(pathname)
        if ((await fs.stat(uri)).type === vscode.FileType.Directory) {

          // Prefer a workspace file if present
          let workspaceFiles = (await fs.readDirectory(uri)).filter(
            ([name, _]) => name.endsWith(".code-workspace"),
          )
          if (workspaceFiles.length === 1) {
            uri = uri.with({ path: path.join(uri.path, workspaceFiles[0][0]) })
          }

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
