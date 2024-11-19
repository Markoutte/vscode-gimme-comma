import * as assert from 'assert';

import * as vscode from 'vscode';
import * as myExtension from '../extension';

async function runTest(
		original: string
): Promise<string> {
	var number = original.indexOf('<!cursor!>');
	const document = await vscode.workspace.openTextDocument({
		"language": 'java',
		"content": original.replace('<!cursor!>', '')
	});
	const editor = await vscode.window.showTextDocument(document);
	const position = editor.document.positionAt(number);
	editor.selection = new vscode.Selection(position, position);
	await myExtension.complete(editor);
	const text = editor.document.getText();
	await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
	return text;
}

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Incomplete Class Test', async () => {
		var text = await runTest('cla<!cursor!>ss A');
		assert.strictEqual(text, 'class A {\n\n}');
	});
});
