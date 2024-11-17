'use strict';

import * as vscode from 'vscode';
import Parser = require('tree-sitter');
import Java from 'tree-sitter-java';
import { build } from './java';
import { Options } from './completers';

export function activate(context: vscode.ExtensionContext) { 
	context.subscriptions.push(vscode.commands.registerCommand('complete-statement.complete-line', () => {
		complete({ ...new Options(), ...{ 'moveCursor' : false, 'newLine' : false }});
	}));
	context.subscriptions.push(vscode.commands.registerCommand('complete-statement.complete-line-and-move-cursor', () => {
		complete({ ...new Options(), ...{ 'moveCursor' : true, 'newLine' : true }});
	}));
}

async function complete(options: Options) {
	const parser = new Parser();
	parser.setLanguage(Java);
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	var tree = parser.parse(editor.document.getText());
	var selection = editor.selection.active;
	const node = findNodeFor(tree.rootNode, selection);

	if (node !== null) {
		for (const completer of build()) {
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