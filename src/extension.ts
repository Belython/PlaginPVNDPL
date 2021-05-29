"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as path from "path"; 
import * as util from "util"; 
import * as inspector from "inspector"; 
 
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 0);
const commandId = 'pvndpl.totalline';
 
const addDecorationWithText = (         
  contentText: string,
  line: number,      
  column: number,   
  activeEditor: vscode.TextEditor   
) => {
  const decorationType = vscode.window.createTextEditorDecorationType({   
    after: {
      contentText, 
      margin: "20px"  
    }
  });
 
  const range = new vscode.Range( 
    new vscode.Position(line, column), 
    new vscode.Position(line, column)    
  );
 
  activeEditor.setDecorations(decorationType, [{ range }]);  
};
 
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {  
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "wombat" is now active!'); 
 
 
  const session = new inspector.Session(); 
  session.connect(); 
  const post = <any>util.promisify(session.post).bind(session); 
  await post("Debugger.enable"); 
  await post("Runtime.enable"); 
 
  let disposable = vscode.commands.registerCommand( 'pvndpl.getvalues', async () => {
      const activeEditor = vscode!.window!.activeTextEditor; 
      if (!activeEditor) { 
        return;
      }
 
      const document = activeEditor!.document; 
      const fileName = path.basename(document.uri.toString());
 
      const { scriptId } = await post("Runtime.compileScript", {  
        expression: document.getText(),         
        sourceURL: fileName,                        
        persistScript: true                               
      });
 
      await post("Runtime.runScript", {              
        scriptId                                                     
      });
      const data = await post("Runtime.globalLexicalScopeNames", {       
        executionContextId: 1                                                                    
      });
      data.names.map(async (expression: string) => {      
        const {
          result: { value } 
        } = await post("Runtime.evaluate", {
          expression, 
          contextId: 1 
        });
        const { result } = await post("Debugger.searchInContent", {      
          scriptId,                
          query: expression   
        });
        addDecorationWithText(         
          `${value}`,                  
          result[0].lineNumber,    
          result[0].lineContent.length,   
          activeEditor              
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
