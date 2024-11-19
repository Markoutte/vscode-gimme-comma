import Parser = require('tree-sitter');
import {TextEditor} from 'vscode'; 

export interface Completer {
    recover(node: Parser.SyntaxNode): Parser.SyntaxNode | null
    valid(node: Parser.SyntaxNode): boolean
    fix(node : Parser.SyntaxNode, editor: TextEditor):PromiseLike<void>
}
