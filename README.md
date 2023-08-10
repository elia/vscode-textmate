# TextMate for Visual Studio Code

This extension aims at recreating the TextMate experience in Visual Studio Code. It is a work in progress and is not yet ready for use.

## Features

### Keybindings

A good amount of keybindings have been ported from TextMate.

### `windowTitle`

You can now use `scmBranchName` in the `windowTitle` setting.

### `vscode-textmate.closeOtherEditors`, `vscode-textmate.closeEditorInAllGroups`

Fix the default VSCode behavior of asking to save unsaved files when closing editors.
These commands will close specified editors except any "dirty" or "pinned" editor.

### `vscode-textmate.openProject`

Open a project in a new window, selecting from subfolders of the folders listed in `vscode-textmate.projectFolders`.

### Bracket/Block Navigation

You can now navigate between brackets and blocks using `ctrl` with `up` and `down`, adding `shift` to also update the selection.

## License

[MIT](LICENSE)

[Icon by Marc Oliver Orth](https://github.com/marc2o/TextMate-macOS-Icon/blob/main/LICENSE)
