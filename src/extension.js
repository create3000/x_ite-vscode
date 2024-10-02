// The module "vscode" contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const
	vscode    = require ("vscode"),
	X3DWindow = require ("./X3DWindow");

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate (context)
{
	const x3dWindow = new X3DWindow (context);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode .commands .registerCommand ("x_ite-vscode.preview-model", () =>
	{
		// The code you place here will be executed every time your command is executed

		const textEditor = vscode .window .activeTextEditor;

		if (!textEditor ?.document)
			return;

		// // Display a message box to the user
		// vscode .window .showInformationMessage ("Running 'X3D: Preview 3D Model'.");

		x3dWindow .panel .openPreview (textEditor);
	});

	context .subscriptions .push (disposable);
}

// This method is called when your extension is deactivated
function deactivate ()
{

}

module .exports = {
	activate,
	deactivate,
};
