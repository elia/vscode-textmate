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
  let disposable = commands.registerCommand(
    "vscode-textmate.openProject",
    async () => {
      const settings = workspace.getConfiguration("vscode-textmate")
      // let recentProjects = settings.get("recentProjects") || []
      let recentProjects = context.globalState.get("recentProjects") || []
      const folders = settings.get("projectFolders") || []
      const iconPath = new ThemeIcon("folder")
      const currentWorkspaceFolder = workspace?.workspaceFolders?.[0]?.uri?.path
      const projects = (await expandFolders(folders))
        .sort((a, b) => {
          if (currentWorkspaceFolder && currentWorkspaceFolder === a) return -1
          if (recentProjects.indexOf(a) > recentProjects.indexOf(b)) return 1
          return -1
        })
        .reverse()
        .flatMap((pathname) => {
          const entries = []
          if (recentProjects.indexOf(pathname) > -1)
            entries.push({ label: "Recent", kind: QuickPickItemKind.Separator })

          entries.push({
            label: path.basename(pathname),
            description: path.dirname(pathname),
            pathname,
            iconPath,
          })

          return entries
        })

      projects.push({ label: ADD })
      console.debug({ projects })

      const pick = await window.showQuickPick(projects, {
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
        recentProjects = recentProjects.filter(
          (x, i) => x !== pathname && i < 10,
        )
        recentProjects.push(pathname)
        // settings.update("recentProjects", recentProjects, true)
        context.globalState.update("recentProjects", recentProjects)

        const uri = Uri.file(pathname)
        if (!workspace.workspaceFolders) {
          commands.executeCommand("vscode.openFolder", uri)
        } else {
          commands.executeCommand("vscode.openFolder", uri, {
            forceNewWindow: true,
          })
        }
      }
    },
  )
  context.subscriptions.push(disposable)
}

const deactivate = () => {}

module.exports = {
  activate,
  deactivate,
}
