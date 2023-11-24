const vscode = require("vscode")

// Test Cases
//
// AFooBar -> a_foo_bar -> aFooBar -> AFooBar
// URLString -> url_string -> urlString -> UrlString
// TestURLString -> test_url_string -> testUrlString -> TestUrlString
// test -> Test -> test
// test_URL_STRING -> testUrlString -> TestUrlString -> test_url_string

// HotFlamingCats -> hot_flaming_cats
function pascalcaseToSnakecase(word) {
  return word.replace(/(\b[A-Z])|([a-z0-9])([A-Z])/g, (_, p1, p2, p3) => {
    if (p1) {
      return `${p1.toLowerCase()}`
    } else {
      return `${p2}_${p3.toLowerCase()}`
    }
  })
}

// hot_flaming_cats -> hotFlamingCats
function snakecaseToCamelcase(word) {
  return word.replace(
    /_([^_]+)/g,
    (_, p1) => p1.charAt(0).toUpperCase() + p1.slice(1),
  )
}

// hotFlamingCats -> HotFlamingCats
function camelcaseToPascalcase(word) {
  return word.replace(/^\w{1}/, (c) => c.toUpperCase())
}

function toggleCase(word) {
  const pascal = /^([^A-Za-z]*)(?=[A-Z])/.exec(word)
  const snake = /^([^A-Za-z]*)(?=.+_)/.exec(word)
  const camel = /^([^A-Za-z]*)(?=[a-z])/.exec(word)

  if (pascal)
    return pascal[1] + pascalcaseToSnakecase(word.slice(pascal[1].length))
  else if (snake)
    return snake[1] + snakecaseToCamelcase(word.slice(snake[1].length))
  else if (camel)
    return camel[1] + camelcaseToPascalcase(word.slice(camel[1].length))
  else return word
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("vscode-textmate.toggleCase", () => {
      const editor = vscode.window.activeTextEditor
      const document = editor.document
      const pattern = /\b(\w[\w\d_-]*)\b/
      editor.edit((builder) => {
        editor.selections.forEach((selection) => {
          if (selection.isEmpty)
            selection = document.getWordRangeAtPosition(
              selection.start,
              pattern,
            )
          const replacement = toggleCase(document.getText(selection).trim())

          builder.replace(selection, replacement)
        })
      })
    }),
  )
}

module.exports = {
  activate,
}
