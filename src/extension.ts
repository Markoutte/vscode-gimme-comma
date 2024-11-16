'use strict';

import * as vscode from 'vscode';
import Parser = require('tree-sitter');
import Java = require('tree-sitter-java');
import * as java from './java';

export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('complete-statement.complete-line', () => {
		complete(false);
	}));
	context.subscriptions.push(vscode.commands.registerCommand('complete-statement.complete-line-and-move-cursor', () => {
		complete();
	}));
}

async function complete(moveCursor: boolean = true) {
	const parser = new Parser();
	parser.setLanguage(Java);
	var editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	var tree = parser.parse(editor.document.getText());
	var selection = editor.selection.active;
	var node = java.findNodeFor(tree.rootNode, selection);
	if (node !== null) {
		const expression = java.findExpressionNode(node);
		if (expression !== null) {
			const endPosition = expression.endPosition;
			const indent =java.createIndent(editor!, expression);
			var semicolon = ";";
			if (moveCursor) {
				semicolon = ";\n\t$0";
			}
			if (!expression.text.endsWith(";")) {
				await editor.insertSnippet(
					new vscode.SnippetString(semicolon),
					new vscode.Position(endPosition.row, endPosition.column)
				);
			};
			if (moveCursor) {
				const p = new vscode.Position(endPosition.row + 1, indent.length);
				editor.selection = new vscode.Selection(p, p);
			}
		}
		var bodySnippet = " {${0}}";
		if (moveCursor) {
			bodySnippet = " {\n\t${0}\n}";
		}
		const method = java.findMethodNode(node);
		if (method !== null) {
			if (!method.children.find((v) => v.type === 'block')) {
				await editor.insertSnippet(
					new vscode.SnippetString(bodySnippet),
					new vscode.Position(method.endPosition.row, method.endPosition.column)
				);
			}
		}
		const ifStmt = java.findIfStatementNode(node);
		if (ifStmt !== null) {
			if (!ifStmt.children.find((v) => v.type === 'block')) {
				const parenthesis = ifStmt.children.find((v) => v.type === 'parenthesized_expression');
				if (parenthesis !== undefined) {
					await editor.insertSnippet(
						new vscode.SnippetString(bodySnippet),
						new vscode.Position(parenthesis.endPosition.row, parenthesis.endPosition.column)
					);
				}
			}
		}
	}
}


