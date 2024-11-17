import * as vscode from 'vscode';
import Parser = require('tree-sitter');
import Java from 'tree-sitter-java';
import { Completer, Options } from '../completers';

export function allCompleters(): Array<Completer> {
	return [
		new MissingSemicolon(), 
		new MethodBody(),
		new IfStmtBody(),
	];
}

export function language() {
	return Java;
}

class MissingSemicolon implements Completer {
    recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
        return findSyntaxNode(node, ['expression_statement', 'local_variable_declaration']);
    }

	valid(node: Parser.SyntaxNode): boolean {
		return node.text.endsWith(';');
	}

    async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor, options: Options) { 
        const endPosition = node.endPosition;
        await editor.edit(editBuilder => {
			const position = new vscode.Position(endPosition.row, endPosition.column);
			editBuilder.insert(position, ';');
		});
		if (options.moveCursor) {
			const range = editor.document.lineAt(endPosition.row).range;
			editor.selection = new vscode.Selection(range.end, range.end);
		}
    }
}

abstract class MissingBody implements Completer {
	abstract recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null
	abstract valid(node: Parser.SyntaxNode): boolean
	abstract fix(node: Parser.SyntaxNode, editor: vscode.TextEditor, options: Options): PromiseLike<void>

	async appendBody(node: Parser.SyntaxNode, editor: vscode.TextEditor, options: Options) {
		const endPosition = node.endPosition;
		const position = new vscode.Position(endPosition.row, endPosition.column);
		if (options.moveCursor) {
			const bodySnippet = " {\n\t${0}\n}";
			editor.insertSnippet(
				new vscode.SnippetString(bodySnippet),
				position
			);
		} else {
			editor.edit(editBuilder => {
				editBuilder.insert(
					position,
					fixIndentation(" {\n\t\n}", node, editor)
				);
			});
		}
	}
}

class MethodBody extends MissingBody {
	recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
        return findSyntaxNode(node, ['method_declaration']);
    }

	valid(node: Parser.SyntaxNode): boolean {
		return node.children.find((v) => v.type === 'block') !== undefined;
	}

	async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor, options: Options) {
		this.appendBody(node, editor, options);
	}
}

class IfStmtBody extends MissingBody {
	recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
        return findSyntaxNode(node, ['if_statement']);
    }

	valid(node: Parser.SyntaxNode): boolean {
		return node.children.find((v) => v.type === 'block') !== undefined;
	}

	async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor, options: Options) {
		const parenthesis = node.children.find((v) => v.type === 'parenthesized_expression') as Parser.SyntaxNode;
		this.appendBody(parenthesis, editor, options);
	}
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

function fixIndentation(snippet: string, node: Parser.SyntaxNode, editor: vscode.TextEditor): string {
	let result = [];
	for (let index = 0; index < snippet.length; index++) {
		const char = snippet[index];
		if (char === '\t') {
			result.push(createIndent(node, editor.options));
		} else if (char === '\n') {
			if (editor.document.eol === vscode.EndOfLine.CRLF) {
				result.push('\r\n');
			} else {
				result.push('\n');
			}
			result.push(createIndent(node, editor.options));
		} else {
			result.push(char);
		}
	}
	return result.join("");
}

function createIndent(node: Parser.SyntaxNode, options: vscode.TextEditorOptions): string {
	const level = calculateIndention(node);
	var size = options.indentSize;
	if (typeof size !== 'number') {
		size = 1;
	}
	if (options.insertSpaces) {
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