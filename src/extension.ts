'use strict';

import * as vscode from 'vscode';
import Parser = require('tree-sitter');
import Java = require('tree-sitter-java');
import { build } from './java';
import { Completer, Options } from './completers';

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
				await completer.fix(problem, editor, options);
			}
		};
	}

	// if (node !== null) {
	// 	const expression = java.findExpressionNode(node);
	// 	if (expression !== null) {
	// 		const endPosition = expression.endPosition;
	// 		const indent =java.createIndent(editor!, expression);
	// 		var semicolon = ";";
	// 		if (moveCursor) {
	// 			semicolon = ";\n\t$0";
	// 		}
	// 		if (!expression.text.endsWith(";")) {
	// 			await editor.insertSnippet(
	// 				new vscode.SnippetString(semicolon),
	// 				new vscode.Position(endPosition.row, endPosition.column)
	// 			);
	// 		};
	// 		if (moveCursor) {
	// 			const p = new vscode.Position(endPosition.row + 1, indent.length);
	// 			editor.selection = new vscode.Selection(p, p);
	// 		}
	// 	}
	// 	var bodySnippet = " {${0}}";
	// 	if (moveCursor) {
	// 		bodySnippet = " {\n\t${0}\n}";
	// 	}
	// 	const method = java.findMethodNode(node);
	// 	if (method !== null) {
	// 		if (!method.children.find((v) => v.type === 'block')) {
	// 			await editor.insertSnippet(
	// 				new vscode.SnippetString(bodySnippet),
	// 				new vscode.Position(method.endPosition.row, method.endPosition.column)
	// 			);
	// 		}
	// 	}
	// 	const ifStmt = java.findIfStatementNode(node);
	// 	if (ifStmt !== null) {
	// 		if (!ifStmt.children.find((v) => v.type === 'block')) {
	// 			const parenthesis = ifStmt.children.find((v) => v.type === 'parenthesized_expression');
	// 			if (parenthesis !== undefined) {
	// 				await editor.insertSnippet(
	// 					new vscode.SnippetString(bodySnippet),
	// 					new vscode.Position(parenthesis.endPosition.row, parenthesis.endPosition.column)
	// 				);
	// 			}
	// 		}
	// 	}
	// }
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