import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function readHideList(workspacePath: string): RegExp[] {
	const hideListPath = path.join(workspacePath, '.hideme');
	try {
		const hideListContent = fs.readFileSync(hideListPath, 'utf8');
		return hideListContent
			.split('\n')
			.map((line) => line.trim())
			.filter((entry) => entry !== '')
			.map((entry) => new RegExp(`^${entry}$`)); // Use '^' and '$' to match the whole line
	} catch (error) {
		console.error(`Error reading .hideme file: ${error}`);
		return [];
	}
}

function hideFilesAndFolders(hideList: RegExp[]) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		return;
	}

	workspaceFolders.forEach((folder) => {
		const config = vscode.workspace.getConfiguration('files', folder.uri);
		const updatedExcludes: Record<string, boolean> = {};

		hideList.forEach((entry) => {
			// Iterate through files and folders in the workspace
			if (folder.uri.fsPath) {
				const filesAndFolders = fs.readdirSync(folder.uri.fsPath);

				filesAndFolders.forEach((item) => {
					if (entry.test(item)) {
						// If the regular expression matches, exclude the file or folder
						updatedExcludes[item] = true;
					}
				});
			}
		});

		config.update('exclude', updatedExcludes, vscode.ConfigurationTarget.Workspace);
	});
}

export function activate(context: vscode.ExtensionContext) {
	console.log('[XYZ HideMe] is now active.');

	// Read and apply .hideme file on extension activation
	const hideList = readHideList(vscode.workspace.rootPath || '');
	hideFilesAndFolders(hideList);

	const disposables: vscode.Disposable[] = [];

	// Monitor changes to the .hideme file and update configuration
	vscode.workspace.onDidChangeTextDocument((e) => {
		if (e.document.fileName.endsWith('.hideme')) {
			hideFilesAndFolders(readHideList(vscode.workspace.rootPath || ''));
		}
	});

	context.subscriptions.push(...disposables);
}

export function deactivate() {
	console.log('[XYZ HideMe] is now deactivated.');
}
