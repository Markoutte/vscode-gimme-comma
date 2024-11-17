import Parser = require('tree-sitter');
import {TextEditor} from 'vscode'; 

export class Options {
    constructor(
        public readonly moveCursor: boolean = false,
        public readonly newLine: boolean = false
    ) {};
}

export interface Completer {
    recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null
    valid(node: Parser.SyntaxNode): boolean
    fix(node : Parser.SyntaxNode, editor: TextEditor, options: Options):PromiseLike<void>
}