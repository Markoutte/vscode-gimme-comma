import * as vscode from 'vscode';
import Parser = require('tree-sitter');
import Java from 'tree-sitter-java';
import { Completer } from '../completers';

export function allCompleters(): Array<Completer> {
	return [
		new IncompleteParenthesis(),
		new MissingSemicolon(), 
		new MethodBody(),
		new IfStmtBody(),
		new IncompleteClassDeclaration,
		new NewLine(),
	];
}

export function language() {
	return Java;
}

class IncompleteParenthesis implements Completer {
	recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
		return findSyntaxNode(node, [
			'parenthesized_expression'
		]);
	}

	valid(node: Parser.SyntaxNode): boolean {
		return node.childCount === 3 && node.children[2].text === ')';
	}

	async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor) {
		const endPosition = node.endPosition;
		await editor.insertSnippet(
			new vscode.SnippetString(")"),
			new vscode.Position(endPosition.row, endPosition.column)
		);
	}

}

class MissingSemicolon implements Completer {
    recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
        return findSyntaxNode(node, [
			'expression_statement', 
			'local_variable_declaration',
			'throw_statement',
			'return_statement',
		]);
    }

	valid(node: Parser.SyntaxNode): boolean {
		return node.text.endsWith(';');
	}

    async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor) { 
        const endPosition = node.endPosition;
		await editor.insertSnippet(
			new vscode.SnippetString(";"),
			new vscode.Position(endPosition.row, endPosition.column)
		);
    }
}

class NewLine extends MissingSemicolon {
	recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
		var recovered = super.recover(node);
		if (recovered?.text.endsWith(';')) {
			return recovered;
		}
        return null;
    }

	valid(node: Parser.SyntaxNode): boolean {
		return false;
	}

	async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor) { 
        const endPosition = node.endPosition;
		await editor.insertSnippet(
			new vscode.SnippetString("\n$0"),
			new vscode.Position(endPosition.row, endPosition.column)
		);
    }
}

abstract class MissingBody implements Completer {
	abstract recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null
	abstract valid(node: Parser.SyntaxNode): boolean
	abstract fix(node: Parser.SyntaxNode, editor: vscode.TextEditor): PromiseLike<void>

	async appendBody(node: Parser.SyntaxNode, editor: vscode.TextEditor) {
		const endPosition = node.endPosition;
		const position = new vscode.Position(endPosition.row, endPosition.column);
		await editor.insertSnippet(
			new vscode.SnippetString(" {\n\t${0}\n}"),
			position
		);
	}
}

class MethodBody extends MissingBody {
	recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
        return findSyntaxNode(node, ['method_declaration']);
    }

	valid(node: Parser.SyntaxNode): boolean {
		return node.children.find((v) => v.type === 'block') !== undefined;
	}

	async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor) {
		this.appendBody(node, editor);
	}
}

class IfStmtBody extends MissingBody {
	recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
        return findSyntaxNode(node, ['if_statement']);
    }

	valid(node: Parser.SyntaxNode): boolean {
		return node.children.find((v) => v.type === 'block') !== undefined;
	}

	async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor) {
		const parenthesis = node.children.find((v) => v.type === 'parenthesized_expression') as Parser.SyntaxNode;
		this.appendBody(parenthesis, editor);
	}
}

class IncompleteClassDeclaration extends MissingBody {
	recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
		var errorNode = findSyntaxNode(node, ['ERROR']);
		if (errorNode === null) {
			var programNode = findSyntaxNode(node, ['program']);
			if (programNode !== null &&
				programNode.childCount === 1 &&
				programNode.children[0].type === 'ERROR'
			) {
				errorNode = programNode.children[0];
			}
		}
		if (errorNode !== null &&
			errorNode.childCount === 2 &&
			errorNode.children[0].type === 'class' &&
			errorNode.children[1].type === 'identifier'
		) {
			return errorNode;
		}
        return null;
    }

	valid(node: Parser.SyntaxNode): boolean {
		return false;
	}

	async fix(node: Parser.SyntaxNode, editor: vscode.TextEditor) {
		await this.appendBody(node, editor);
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