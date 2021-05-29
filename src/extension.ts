"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path";  // читаем файлы с диска и нам потребуется путь к ним
import * as util from "util"; // метод удобный интерфесй промисоф
import * as inspector from "inspector"; 
 
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
const commandId = 'pvndpl5.helloWorld2';
 
const addDecorationWithText = (         
  contentText: string,
  line: number,            // номер строчки 
  column: number,       //  номер колонки в котором будет отображаться 
  activeEditor: vscode.TextEditor   // текущее окно редактора 
) => {
  const decorationType = vscode.window.createTextEditorDecorationType({     //(каждый раз будет создавать свой тип)
    after: {
      contentText,  // текст
      margin: "20px"  
    }
  });
 
  const range = new vscode.Range(  // диапазон  в котором наша декорация активна 
    new vscode.Position(line, column),   // номер строки
    new vscode.Position(line, column)    // номер колонки
  );
 
  activeEditor.setDecorations(decorationType, [{ range }]);  // передаем decorationType и  range
};
 
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {  // делаем функцию асинхронной, для того чтобы использовать синтаксис асинк авей
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "wombat" is now active!'); 
 
 
  const session = new inspector.Session(); // получим новую сессию из инспектора
  session.connect(); // запускаем новое соединение 
  const post = <any>util.promisify(session.post).bind(session); // обернули в метод промисоф из ютил, для испольщования удобного интерфейса промисоф
                                                                            //пишем bind для правильной работы 
																			// из за того что post перегружена используем тип <any>
  //   const on = <any>util.promisify(session.on).bind(session);
  await post("Debugger.enable"); // активируем  Debugger
  await post("Runtime.enable"); // активируем  Runtime
 
  let disposable = vscode.commands.registerCommand( 'pvndpl5.helloWorld', async () => { // делаем переданный туда кулбэк асинхронным
      const activeEditor = vscode!.window!.activeTextEditor; // получаем текущий активный редактор 
      if (!activeEditor) { // если текущий активный редактор не доступен, то останавливаем выполнение
        return;
      }
 
      const document = activeEditor!.document; // получаем ссылку на активный документ из редактора через точку
      const fileName = path.basename(document.uri.toString()); // получаем название файла из документа
 
      // on("Runtime.executionContextCreated", (data: any) => {
      //   console.log("EXECUTION CONTEXT", data);
      // });
      // приступаем к выполнению скрипта, для начала копилируем
      const { scriptId } = await post("Runtime.compileScript", {  // получим значение скрипта выполнив скрипт 
        expression: document.getText(),          // передаем текст самого скрипта
        sourceURL: fileName,                        // передаем название файла
        persistScript: true                               // что скрипт не затирался true 
      });
 
      await post("Runtime.runScript", {              // запуск скрипта
        scriptId                                                      // передаем скрипт id
      });
      const data = await post("Runtime.globalLexicalScopeNames", {        // нужно получить имена переменных 
        executionContextId: 1                                                                      // контекст id (берем переменные только из глобального контекста)
      });
      data.names.map(async (expression: string) => {        // проходимся в цикле по именам переменных через асинхрон кулбек 
        const {
          result: { value } // значение переменной
        } = await post("Runtime.evaluate", {
          expression, // передаем выражение 
          contextId: 1 
        });
        const { result } = await post("Debugger.searchInContent", {      // где находиться 
          scriptId,                   // скрипт id
          query: expression   //  запрос - название переменной  
        });
        addDecorationWithText(          // отображение результата в файле
          `${value}`,                   // значение переенной 
          result[0].lineNumber,      // номер строки 
          result[0].lineContent.length,    // номер ячейки (сколько в этой строке сиволов)
          activeEditor                   // активный редактор   
        );
      });
 
      // Display a message box to the user
      vscode.window.showInformationMessage("Done!");
    }
  );
 
  context.subscriptions.push(disposable);
 
 
  context.subscriptions.push(vscode.commands.registerCommand(commandId, function () {
	vscode.window.showInformationMessage(`${getTotalLines()}   *Happy Coding...*!`);
}));
 
statusBarItem.command = commandId;
context.subscriptions.push(statusBarItem);
 
context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBarItem));
context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(updateStatusBarItem));
 
  // update status bar item once at start
updateStatusBarItem();
}
 
 
function getTotalLines() {
const editor = vscode.window.activeTextEditor;
let totalLines = 0;
if (editor) {
  const doc = editor.document;
  totalLines = (doc.getText().match(/\n/g) || '').length + 1;
}
return `Total ${totalLines > 1 ? `Lines:` : `Line:` } ${totalLines}`;
}
 
function updateStatusBarItem() {
const editor = vscode.window.activeTextEditor;
statusBarItem.text =  getTotalLines();
  statusBarItem.tooltip = `Total Lines`
editor ? statusBarItem.show() :  statusBarItem.hide() ;
 
}
 
// this method is called when your extension is deactivated
export function deactivate() {}
 
module.exports = {
	activate,
	deactivate
}
