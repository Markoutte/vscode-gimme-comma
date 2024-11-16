import * as vscode from 'vscode';
import Parser = require('tree-sitter');
import java from 'tree-sitter-java';

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
	parser.setLanguage(java);
	var editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	var tree = parser.parse(editor.document.getText());
	var selection = editor.selection.active;
	var node = findNodeFor(tree.rootNode, selection);
	if (node !== null) {
		const expression = findExpressionNode(node);
		if (expression !== null) {
			const endPosition = expression.endPosition;
			const indent = createIndent(editor!, expression);
			var postfix = "";
			if (moveCursor) {
				postfix = `\n${indent}`;
			}
			if (!expression.text.endsWith(";")) {
				await editor.edit(editBuilder => {
					editBuilder.replace(
						new vscode.Position(endPosition.row, endPosition.column),
						`;${postfix}`
					);
				});
			};
			if (moveCursor) {
				const p = new vscode.Position(endPosition.row + 1, indent.length);
				editor.selection = new vscode.Selection(p, p);
			}
		}
	}
}

function createIndent(editor: vscode.TextEditor, node: Parser.SyntaxNode): string {
	const level = calculateIndention(node);
	var size = editor.options.indentSize;
	if (typeof size !== 'number') {
		size = 1;
	}
	if (editor.options.insertSpaces) {
		return " ".repeat(level * size);
	} else {
		return "\t".repeat(level);
	}
}

function calculateIndention(node: Parser.SyntaxNode): number {
	var level = 0;
	var current: Parser.SyntaxNode | null = node;
	while (current !== null) {
		current = current.parent;
		if (['block', 'class_declaration'].includes(current?.type ?? "")) {
			level++;
		}
	}
	return level;
}

function findNodeFor(node: Parser.SyntaxNode, selection: vscode.Position): Parser.SyntaxNode | null {
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

function findExpressionNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
	var current: Parser.SyntaxNode | null = node;
	while (current !== null) {
		if (current.type === 'expression_statement' || current.type === 'local_variable_declaration') {
			break;
		}
		current = current.parent;
	}
	return current;
}

// This method is called when your extension is deactivated
export function deactivate() {}

// Utilities

function isInRange(value: number, from: number, to: number) {
	return from <= value && value <= to;
}
