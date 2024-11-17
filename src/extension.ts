'use strict';

import * as vscode from 'vscode';
import Parser = require('tree-sitter');
import { Options } from './completers';

export function activate(context: vscode.ExtensionContext) { 
	context.subscriptions.push(vscode.commands.registerCommand('complete-statement.complete-line', () => {
		complete({ ...new Options(), ...{ 'moveCursor' : false, 'newLine' : false }});
	}));
	context.subscriptions.push(vscode.commands.registerCommand('complete-statement.complete-line-and-move-cursor', () => {
		complete({ ...new Options(), ...{ 'moveCursor' : true, 'newLine' : true }});
	}));
}

const supportedLanguages = ["java"];

async function complete(options: Options) {
	const parser = new Parser();
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const languageId = editor.document.languageId;
	if (!supportedLanguages.includes(languageId)) {
		return;
	}
	try {
		var bundle = await import(`./languages/${languageId}.js`);
	} catch (e) {
		console.error(e);
		return;
	}
	parser.setLanguage(bundle.language());
	var tree = parser.parse(editor.document.getText());
	var selection = editor.selection.active;
	const node = findNodeFor(tree.rootNode, selection);

	if (node !== null) {
		for (const completer of bundle.allCompleters()) {
			const problem = completer.recover(node);
			if (problem !== null) {
				if (!completer.valid(problem)) {
					await completer.fix(problem, editor, options);
					break;
				}
			}
		};
	}
} 

export function findNodeFor(node: Parser.SyntaxNode, selection: vscode.Position): Parser.SyntaxNode | null {
	var sp = node.startPosition;
	var ep = node.endPosition;
	if (isInRange(selection.line, sp.row, ep.row) && 
		isInRange(selection.character, sp.column, ep.column)) {
		return node;
	}
	var retval = null;
	for (const child of node.children) {
		retval = findNodeFor(child, selection);
		if (retval !== null) {
			break;
		}
}	
	return retval;
} 

function isInRange(value: number, from: number, to: number) {
	return from <= value && value <= to;
} 

// This method is called when your extension is deactivated
export function deactivate() {}