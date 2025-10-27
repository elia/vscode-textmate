# TextMate for Visual Studio Code

<!-- <img src="./icon.png" width="36" align="top" style="width:1.4em;vertical-align:middle;line-height:0;"> -->

This extension aims at recreating the TextMate experience in Visual Studio Code. 

## Features

### TextMate Commands

Execute arbitrary scripts with configurable input/output handling via keyboard shortcuts. Define commands directly in your `keybindings.json` with full control over execution context.

#### Usage

Add keybindings to your `keybindings.json`:

```json
{
  "key": "ctrl+alt+cmd+t",
  "command": "vscode-textmate.command",
  "when": "editorTextFocus",
  "args": {
    "script": "#!/usr/bin/env bash\n\nopen \"$TM_PROJECT_DIRECTORY\" -a Terminal.app",
    "save": "currentDocument",
    "input": "none",
    "output": "discard"
  }
}
```

#### Arguments

- **`script`** (string): Shell script to execute (supports shebang)
- **`save`**: Document saving - `"none"` | `"currentDocument"` | `"allDocuments"`
- **`input`**: Input source - `"selection"` | `"document"` | `"line"` | `"word"` | `"character"` | `"scope"` | `"none"`
- **`output`**: Output handling - `"replaceInput"` | `"replaceSelection"` | `"replaceDocument"` | `"insertText"` | `"insertAsSnippet"` | `"newDocument"` | `"showAsHTML"` | `"showAsTooltip"` | `"discard"`
- **`outputFormat`**: Output format - `"text"` | `"snippet"` | `"HTML"`
- **`caretPlacement`**: Caret positioning - `"afterOutput"` | `"selectOutput"` | `"characterInterpolation"` | `"lineInterpolation"` | `"Heuristic"`

#### Environment Variables

Scripts receive TextMate-style environment variables:

- `TM_SELECTED_TEXT` - Currently selected text
- `TM_CURRENT_LINE` - Current line content
- `TM_CURRENT_WORD` - Current word at cursor
- `TM_FILENAME` - Current file name
- `TM_FILEPATH` - Current file path
- `TM_DIRECTORY` - Current file directory
- `TM_PROJECT_DIRECTORY` - Workspace root directory
- `TM_LINE_INDEX` - Current line (0-based)
- `TM_LINE_NUMBER` - Current line (1-based)
- `TM_COLUMN_NUMBER` - Current column (1-based)

#### Examples

**Text transformation:**
```json
{
  "key": "ctrl+u",
  "command": "vscode-textmate.command",
  "when": "editorTextFocus",
  "args": {
    "script": "tr '[:lower:]' '[:upper:]'",
    "input": "selection",
    "output": "replaceInput"
  }
}
```

**Insert timestamp:**
```json
{
  "key": "ctrl+alt+d",
  "command": "vscode-textmate.command",
  "when": "editorTextFocus",
  "args": {
    "script": "date +%Y-%m-%d",
    "input": "none",
    "output": "insertText"
  }
}
```

**Sort lines:**
```json
{
  "key": "ctrl+alt+s",
  "command": "vscode-textmate.command",
  "when": "editorTextFocus",
  "args": {
    "script": "sort",
    "input": "selection",
    "output": "replaceInput"
  }
}
```

### Keybindings

A good amount of keybindings have been ported from TextMate.

### `windowTitle`

You can now use `scmBranchName` in the `windowTitle` setting.

### `closeOtherEditors`, `closeEditorInAllGroups`

Fix the default VSCode behavior of asking to save unsaved files when closing editors.
These commands will close specified editors except any "dirty" or "pinned" editor.

### `openProject`

Open a project in a new window, selecting from subfolders of the folders listed in the `projectFolders` setting.

### `openQuickly`

Quick file opener that replaces VS Code's default "Open Quickly…" command with TextMate's behavior. Press <kbd>⌘T</kbd> to open a searchable list of all files in the workspace, filtered intelligently to exclude common build artifacts and dependencies. Uses the same selection interface as other TextMate commands for a consistent experience.

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

### File Operations

| Name         | Command       | Keybinding    |
| ------------ | ------------- | ------------- |
| Open Quickly | `openQuickly` | <kbd>⌘T</kbd> |

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
