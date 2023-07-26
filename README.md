# TextMate for Visual Studio Code

This extension aims at recreating the TextMate experience in Visual Studio Code. It is a work in progress and is not yet ready for use.

## Features

### Keybindings

A good amount of keybindings have been ported from TextMate.

### `windowTitle`

You can now use `scmBranchName` in the `windowTitle` setting.

### `vscode-textmate.closeOtherEditors`

Fix the default VSCode behavior of asking to save unsaved files when closing other editors.
This command will silently close all editors except the current one and any "dirty" editor.

### Bracket/Block Navigation

You can now navigate between brackets and blocks using `ctrl` with `up` and `down`, adding `shift` to also update the selection.

## License

[MIT](LICENSE)

[Icon by Marc Oliver Orth](https://github.com/marc2o/TextMate-macOS-Icon/blob/main/LICENSE)
