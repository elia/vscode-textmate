# TextMate for Visual Studio Code

<!-- <img src="./icon.png" width="36" align="top" style="width:1.4em;vertical-align:middle;line-height:0;"> -->

This extension aims at recreating the TextMate experience in Visual Studio Code. It is a work in progress and is not yet ready for use.

## Features

### Keybindings

A good amount of keybindings have been ported from TextMate.

### `windowTitle`

You can now use `scmBranchName` in the `windowTitle` setting.

### `closeOtherEditors`, `closeEditorInAllGroups`

Fix the default VSCode behavior of asking to save unsaved files when closing editors.
These commands will close specified editors except any "dirty" or "pinned" editor.

### `openProject`

Open a project in a new window, selecting from subfolders of the folders listed in the `projectFolders` setting.

### `selectFromList` (internal)

Provides a flexible UI for selecting items from a list. Shows a webview-based selection interface that allows for multi-selection from a provided array of items.
Can be used by other extensions as a nearly drop-in replacement for `showQuickPick`.

#### Command Usage

```js
picks = await vscode.commands.executeCommand(
  "vscode-textmate.showSelectFromList",
  items,
  options
)
```

#### Parameters

- **`items`** (array, required): Array of items to select from. Items can be:
  - Strings: `"Item 1"`
  - Numbers/Booleans: `42`, `true`
  - Objects: `{ label: "Custom Item", description: "Optional description" }`

- **`options`** (object, optional): Configuration options
  - **`title`** (string): Title displayed in the selection interface (default: `"Select From List"`)
  - **`renderAs`** (string): Where to show the interface:
    - `"sidebar"`: Shows in dedicated sidebar view
    - `"panel"`: Opens in webview panel
    - Defaults to user's `vscode-textmate.selectFromList.renderAs` setting

#### Examples

```js
// Simple string selection
const picks = await vscode.commands.executeCommand(
  "vscode-textmate.showSelectFromList",
  ["Option 1", "Option 2", "Option 3"],
  { title: "Choose Options" }
)

// Mixed item types with custom rendering
const picks = await vscode.commands.executeCommand(
  "vscode-textmate.showSelectFromList",
  [
    "Simple string",
    { label: "Complex Item", description: "With description" },
    42,
    true
  ],
  {
    title: "Mixed Selection",
    renderAs: "panel"
  }
)
```

### Navigation

You can now navigate between brackets and blocks using `ctrl` with `up` and `down`, adding `shift` to also update the selection.

| Name                          | Command                                     | Keybinding     |
| ----------------------------- | ------------------------------------------- | -------------- |
| Jump to Selection             | `jumpToSelection`                           | <kbd>⌘J</kbd>  |
| Move to beginning of Block    | `moveToBeginningOfBlock`                    | <kbd>⌃⭡</kbd>  |
| Move to end of Block          | `moveToEndOfBlock`                          | <kbd>⌃⭣</kbd>  |
| Select to beginning of Block  | `moveToBeginningOfBlockAndModifySelection`  | <kbd>⌃⇧⭡</kbd> |
| Select to end of Block        | `moveToEndOfBlockAndModifySelection`        | <kbd>⌃⇧⭣</kbd> |
| Move to beginning of Column   | `moveToBeginningOfColumn`                   | <kbd>⌥⭡</kbd>  |
| Move to end of Column         | `moveToEndOfColumn`                         | <kbd>⌥⭣</kbd>  |
| Select to beginning of Column | `moveToBeginningOfColumnAndModifySelection` | <kbd>⌥⇧⭡</kbd> |
| Select to end of Column       | `moveToEndOfColumnAndModifySelection`       | <kbd>⌥⇧⭣</kbd> |
| Jump to Selection             | `jumpToSelection`                           | <kbd>⌘J</kbd>  |

### Editing

| Name        | Command      | Keybinding     |
| ----------- | ------------ | -------------- |
| Join Lines  | `joinLines`  | <kbd>⌃⇧J</kbd> |
| Toggle Case | `toggleCase` | <kbd>⌃_</kbd>  |
| Transpose   | `transpose`  | <kbd>⌃T</kbd>  |

_All commands are under the `vscode-textmate` namespace, e.g. `vscode-textmate.moveToEndOfColumn`._

## Troubleshooting

**VS Code plays a sound with some keybindings:** https://superuser.com/a/1530872

## License

[MIT](LICENSE)

[Icon by Marc Oliver Orth](https://github.com/marc2o/TextMate-macOS-Icon/blob/main/LICENSE)
