// See https://github.com/zigapeda/open-project-folder for more information and LICENSING.

let path = require("path")
let vscode = require("vscode")

let fs = vscode.workspace.fs
let ADD_CONTAINING_FOLDER = "$(add) Add Projects Containing Folder"
let ADD_FOLDER = "$(add) Add Project Folder"

let activate = (context) => {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.openProject", async () => {
      let settings = vscode.workspace.getConfiguration("vscode-textmate")
      let useQuickPick = settings.get("openProject.useQuickPick", false)
      let currentFolders = getCurrentFolders()

      let [recentFolders, favorites] = await Promise.all([
        getValidRecentFolders(context, currentFolders),
        getFavoriteFolders(settings, currentFolders),
      ])

      let items = buildProjectItems(recentFolders, favorites, currentFolders, useQuickPick)
      let picks = await showProjectPicker(items, useQuickPick)

      await handleProjectSelection(picks, context, settings, recentFolders)
    }),
  )

  autoOpenProjectIfEmpty()
}

// Helper functions hoisted to bottom for readability

function getCurrentFolders() {
  return vscode.workspace?.workspaceFolders?.map((f) => f.uri?.path) || []
}

async function getValidRecentFolders(context, currentFolders) {
  let allRecentFolders = context.globalState.get("recentFolders") || []
  let validRecentFolders = []

  for (let folderPath of allRecentFolders) {
    if (await folderExists(folderPath)) {
      validRecentFolders.push(folderPath)
    }
  }

  if (validRecentFolders.length !== allRecentFolders.length) {
    context.globalState.update("recentFolders", validRecentFolders)
  }

  return validRecentFolders
    .filter((p) => !currentFolders.includes(p))
    .reverse()
}

async function getFavoriteFolders(settings, currentFolders) {
  let favorites = await expandDirEntries(settings.get("favorites") || [])
  return favorites
    .filter((p) => !currentFolders.includes(p))
    .sort((a, b) =>
      path.basename(a).toLowerCase().localeCompare(path.basename(b).toLowerCase())
    )
}

function buildProjectItems(recentFolders, favorites, currentFolders, useQuickPick) {
  let items = []
  let iconPath = new vscode.ThemeIcon("folder")
  favorites = favorites.filter((p) => !recentFolders.includes(p))

  addProjectSection(items, "Recent", recentFolders, iconPath, useQuickPick)
  addProjectSection(items, "Favorites", favorites, iconPath, useQuickPick)
  addProjectSection(items, "Current", currentFolders, iconPath, useQuickPick)

  items.push({ label: ADD_CONTAINING_FOLDER })
  items.push({ label: ADD_FOLDER })

  return items
}

function addProjectSection(items, label, pathnames, iconPath, useQuickPick) {
  if (pathnames.length === 0) return

  if (useQuickPick) {
    items.push({ label, kind: vscode.QuickPickItemKind.Separator })
  }

  pathnames.forEach((pathname) =>
    items.push({
      label: path.basename(pathname),
      description: path.dirname(pathname),
      pathname,
      iconPath,
    })
  )
}

async function showProjectPicker(items, useQuickPick) {
  let pickerOptions = {
    title: "Open Recent Project",
    matchOnDescription: true,
    matchOnDetail: true,
    canSelectMany: true,
    ignoreFocusOut: true,
  }

  if (useQuickPick) {
    return [await vscode.window.showQuickPick(items, pickerOptions)]
  } else {
    return await vscode.commands.executeCommand(
      "vscode-textmate.showSelectFromList",
      items,
      pickerOptions
    )
  }
}

async function handleProjectSelection(picks, context, settings, recentFolders) {
  for (let pick of picks || []) {
    if (isAddFolderAction(pick)) {
      await addNewFavorite(pick, settings)
    } else if (pick.pathname) {
      await openProject(pick.pathname, context, recentFolders)
    }
  }
}

function isAddFolderAction(pick) {
  return pick.label === ADD_CONTAINING_FOLDER || pick.label === ADD_FOLDER
}

async function addNewFavorite(pick, settings) {
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
    let folderEntry = pick.label === ADD_FOLDER ? fsPath : `[DIR] ${fsPath}`
    let favorites = (settings.get("favorites") || []).concat(folderEntry)
    settings.update("favorites", favorites, true)
  }
}

async function openProject(pathname, context, recentFolders) {
  recentFolders = recentFolders.filter((x, i) => x !== pathname && i < 10)
  recentFolders = [...recentFolders, pathname]
  context.globalState.update("recentFolders", recentFolders)

  let uri = vscode.Uri.file(pathname)
  if (await folderExists(pathname)) {
    let workspaceFiles = (await fs.readDirectory(uri))
      .filter(([name, _]) => name.endsWith(".code-workspace"))

    if (workspaceFiles.length === 1) {
      uri = uri.with({ path: path.join(uri.path, workspaceFiles[0][0]) })
    }

    vscode.commands.executeCommand("vscode.openFolder", uri, {
      forceNewWindow: vscode.workspace.workspaceFolders,
    })
  } else {
    vscode.commands.executeCommand("vscode.open", uri)
  }
}

async function folderExists(folderPath) {
  try {
    let stat = await fs.stat(vscode.Uri.file(folderPath))
    return stat.type === vscode.FileType.Directory
  } catch (e) {
    return false
  }
}

async function expandDirEntries(folders) {
  let expanded = await Promise.all(
    folders.map(async (folder) => {
      if (folder.startsWith("[DIR] ")) {
        folder = folder.slice(6)
        folder = vscode.Uri.file(folder)
        try {
          let stat = await fs.stat(folder)
          if (stat.type === vscode.FileType.Directory) {
            let files = await fs.readDirectory(folder)
            files = files.filter(([fileName, _]) => !fileName.startsWith("."))
            return files.map(([fileName, _]) => path.join(folder.fsPath, fileName))
          }
        } catch (e) {
          console.error(folder, e)
        }
      }
      return folder
    })
  )
  return expanded.flat()
}

function autoOpenProjectIfEmpty() {
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
