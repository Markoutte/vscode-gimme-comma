import * as vscode from 'vscode';
import Parser = require('tree-sitter');

export function createIndent(editor: vscode.TextEditor, node: Parser.SyntaxNode): string {
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

export function calculateIndention(node: Parser.SyntaxNode): number {
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

export function findExpressionNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
	return findSyntaxNode(node, ['expression_statement', 'local_variable_declaration']);
}

export function findMethodNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
	return findSyntaxNode(node, ['method_declaration']);
}

export function findIfStatementNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
	return findSyntaxNode(node, ['if_statement']);
}

function findSyntaxNode(node: Parser.SyntaxNode, types: Array<string>): Parser.SyntaxNode | null {
	var current: Parser.SyntaxNode | null = node;
	while (current !== null) {
		if (types.includes(current.type)) {
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