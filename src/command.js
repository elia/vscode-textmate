const vscode = require("vscode")
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
const os = require("os")

/**
 * Generic TextMate-style command executor
 * Handles script execution with configurable input/output based on args
 */
class CommandExecutor {
  constructor(editor, args = {}) {
    this.editor = editor || {
      document: {
        isDirty: false,
        getText: () => "",
        fileName: ""
      },
      selection: {
        isEmpty: true,
        active: new vscode.Position(0, 0),
        start: new vscode.Position(0, 0),
        end: new vscode.Position(0, 0)
      }
    }
    this.document = this.editor.document
    this.selection = this.editor.selection
    this.args = args
  }

  /**
   * Execute the command with the provided arguments
   */
  async execute() {
    try {
      // Save documents if requested
      await this.handleSave()

      // Get input based on configuration
      let input = await this.getInput()

      // Execute script
      let output = await this.runScript(input)

      // Handle output based on configuration
      await this.handleOutput(output)

    } catch (error) {
      vscode.window.showErrorMessage(`Command failed: ${error.message}`)
    }
  }

  /**
   * Handle document saving based on save argument
   */
  async handleSave() {
    switch (this.args.save) {
      case "currentDocument":
        if (this.document.isDirty) {
          await this.document.save()
        }
        break
      case "allDocuments":
        await vscode.workspace.saveAll()
        break
      case "none":
      default:
        // No saving
        break
    }
  }

  /**
   * Get input based on input argument
   */
  async getInput() {
    switch (this.args.input) {
      case "selection":
        return this.document.getText(this.selection)

      case "document":
        return this.document.getText()

      case "scope":
        // For now, return current line - could be enhanced for language-specific scopes
        return this.document.lineAt(this.selection.active.line).text

      case "line":
        return this.document.lineAt(this.selection.active.line).text

      case "word":
        let wordRange = this.document.getWordRangeAtPosition(this.selection.active)
        return wordRange ? this.document.getText(wordRange) : ""

      case "character":
        if (this.selection.isEmpty) {
          let position = this.selection.active
          let range = new vscode.Range(position, position.translate(0, 1))
          return this.document.getText(range)
        }
        return this.document.getText(this.selection)

      case "none":
      default:
        return ""
    }
  }

  /**
   * Execute the script with input
   */
  async runScript(input) {
    if (!this.args.script) {
      return input
    }

    return new Promise((resolve, reject) => {
      // Create temporary script file
      let tempDir = os.tmpdir()
      let scriptPath = path.join(tempDir, `vscode-textmate-command-${Date.now()}.sh`)

      // Ensure script has shebang
      let scriptContent = this.args.script
      if (!scriptContent.startsWith("#!")) {
        scriptContent = "#!/bin/bash\n" + scriptContent
      }

      fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 })

      // Set up environment variables (TextMate style)
      let workspaceFolder = vscode.workspace.workspaceFolders?.[0]
      let documentEnv = this.document ? {
        TM_SELECTED_TEXT: this.document.getText(this.selection),
        TM_CURRENT_LINE: this.document.lineAt(this.selection.active.line).text,
        TM_CURRENT_WORD: this.getCurrentWord(),
        TM_FILENAME: this.document.fileName ? path.basename(this.document.fileName) : "",
        TM_FILEPATH: this.document.fileName || "",
        TM_DIRECTORY: this.document.fileName ? path.dirname(this.document.fileName) : "",
        TM_LINE_INDEX: this.selection.active.line.toString(),
        TM_LINE_NUMBER: (this.selection.active.line + 1).toString(),
        TM_COLUMN_NUMBER: (this.selection.active.character + 1).toString(),
      } : {}
      let env = {
        ...process.env,
        ...documentEnv,
        TM_PROJECT_DIRECTORY: workspaceFolder?.uri?.fsPath || "",
      }

      let child = spawn(scriptPath, [], {
        env,
        cwd: workspaceFolder?.uri?.fsPath || process.cwd()
      })

      let stdout = ""
      let stderr = ""

      child.stdout.on("data", (data) => {
        stdout += data.toString()
      })

      child.stderr.on("data", (data) => {
        stderr += data.toString()
      })

      child.on("close", (code) => {
        // Clean up temp file
        try {
          fs.unlinkSync(scriptPath)
        } catch (e) {
          // Ignore cleanup errors
        }

        if (code !== 0) {
          reject(new Error(`Script exited with code ${code}: ${stderr}`))
        } else {
          resolve(stdout)
        }
      })

      child.on("error", (error) => {
        // Clean up temp file
        try {
          fs.unlinkSync(scriptPath)
        } catch (e) {
          // Ignore cleanup errors
        }
        reject(error)
      })

      // Send input to script
      if (input) {
        child.stdin.write(input)
      }
      child.stdin.end()
    })
  }

  /**
   * Handle output based on output and outputFormat arguments
   */
  async handleOutput(output) {
    let outputType = this.args.output || "replaceInput"
    let outputFormat = this.args.outputFormat || "text"
    let caretPlacement = this.args.caretPlacement || "afterOutput"

    // Process output based on format
    let processedOutput = this.processOutputFormat(output, outputFormat)

    // Apply output based on type
    switch (outputType) {
      case "replaceInput":
        await this.replaceInput(processedOutput)
        break

      case "replaceDocument":
        await this.replaceDocument(processedOutput)
        break

      case "replaceSelection":
        await this.replaceSelection(processedOutput)
        break

      case "insertText":
        await this.insertText(processedOutput)
        break

      case "insertAsSnippet":
        await this.insertAsSnippet(processedOutput)
        break

      case "newDocument":
        await this.createNewDocument(processedOutput)
        break

      case "showAsHTML":
        await this.showAsHTML(processedOutput)
        break

      case "showAsTooltip":
        vscode.window.showInformationMessage(processedOutput)
        break

      case "discard":
        // Do nothing
        break

      default:
        await this.replaceInput(processedOutput)
        break
    }

    // Handle caret placement
    await this.handleCaretPlacement(caretPlacement)
  }

  /**
   * Process output based on format
   */
  processOutputFormat(output, format) {
    switch (format) {
      case "text":
        return output
      case "snippet":
        return output // VS Code will handle snippet syntax
      case "HTML":
        return output
      case "completionList":
        // This would need special handling for completion
        return output
      default:
        return output
    }
  }

  /**
   * Replace the input (selection or insertion point)
   */
  async replaceInput(output) {
    await this.editor.edit(editBuilder => {
      if (this.selection.isEmpty) {
        editBuilder.insert(this.selection.start, output)
      } else {
        editBuilder.replace(this.selection, output)
      }
    })
  }

  /**
   * Replace entire document
   */
  async replaceDocument(output) {
    let fullRange = new vscode.Range(
      this.document.positionAt(0),
      this.document.positionAt(this.document.getText().length)
    )
    await this.editor.edit(editBuilder => {
      editBuilder.replace(fullRange, output)
    })
  }

  /**
   * Replace current selection
   */
  async replaceSelection(output) {
    if (!this.selection.isEmpty) {
      await this.editor.edit(editBuilder => {
        editBuilder.replace(this.selection, output)
      })
    }
  }

  /**
   * Insert text at cursor
   */
  async insertText(output) {
    await this.editor.edit(editBuilder => {
      editBuilder.insert(this.selection.active, output)
    })
  }

  /**
   * Insert as snippet
   */
  async insertAsSnippet(output) {
    await this.editor.insertSnippet(new vscode.SnippetString(output))
  }

  /**
   * Create new document with output
   */
  async createNewDocument(output) {
    let doc = await vscode.workspace.openTextDocument({
      content: output,
      language: "text"
    })
    await vscode.window.showTextDocument(doc)
  }

  /**
   * Show output as HTML in webview
   */
  async showAsHTML(output) {
    let panel = vscode.window.createWebviewPanel(
      "commandOutput",
      "Command Output",
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    )
    panel.webview.html = output
  }

  /**
   * Handle caret placement after output
   */
  async handleCaretPlacement(placement) {
    // This would be implemented based on the specific placement type
    // For now, we'll keep default behavior
    switch (placement) {
      case "afterOutput":
        // Default behavior - cursor already positioned after output
        break
      case "selectOutput":
        // Would need to track where output was inserted and select it
        break
      case "characterInterpolation":
      case "lineInterpolation":
      case "Heuristic":
        // Advanced placement logic would go here
        break
    }
  }

  /**
   * Get current word at cursor
   */
  getCurrentWord() {
    let wordRange = this.document.getWordRangeAtPosition(this.selection.active)
    return wordRange ? this.document.getText(wordRange) : ""
  }
}

function activate(context) {
  // Register the main command that accepts arguments
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.command", async (args) => {
      let editor = vscode.window.activeTextEditor
      // if (!editor) {
      //   vscode.window.showErrorMessage("No active text editor")
      //   return
      // }

      let executor = new CommandExecutor(editor, args)
      await executor.execute()
    })
  )
}

module.exports = {
  activate
}
