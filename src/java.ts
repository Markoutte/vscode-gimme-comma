import * as vscode from 'vscode';
import Parser = require('tree-sitter');
import { Completer, Options } from './completers';

export function build(): Array<Completer> {
    return [new MissingSemicolon()];
}

class MissingSemicolon implements Completer {
    recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
        return findSyntaxNode(node, ['expression_statement', 'local_variable_declaration']);
    }
    async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor, options: Options) { 
        const endPosition = node.endPosition;
        var semicolon = '';
        if (!node.text.endsWith(';')) {
            semicolon = ';';
        }
        if (options.newLine) {
            semicolon = semicolon + '\n';
        }
        if (options.moveCursor) {
            semicolon = semicolon + '$0';
        }
        if (semicolon !== '') { 
            await editor.insertSnippet(
                new vscode.SnippetString(semicolon),
                new vscode.Position(endPosition.row, endPosition.column)
            );
        }
    } 
}

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
