/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

/**
 * Tree-sitter grammar for Rotom — a high-level scripting language for
 * Pokémon Generation 4 (Diamond/Pearl/Platinum/HGSS) field scripts.
 *
 * @see https://github.com/KalaayPT/rotom/blob/main/rotoscript_spec.md
 */

export default grammar({
  name: 'rotom',

  extras: $ => [
    /\s/,
    $.comment,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.function_definition],
    [$.label_definition],
    [$.command_statement],
    [$.movement_statement],
  ],

  rules: {
    source_file: $ => repeat($._top_level_item),

    _top_level_item: $ => choice(
      $.alias_statement,
      $.function_definition,
      $.action_definition,
      $.label_definition,
      $.preprocessor_directive,
    ),

    // Comments
    comment: $ => token(choice(
      seq('//', /.*/),
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'),
    )),

    identifier: $ => /[A-Za-z_][A-Za-z0-9_]*/,

    number: $ => token(choice(
      /0[xX][0-9a-fA-F]+/,
      /-?[0-9]+/,
    )),

    boolean: $ => choice('true', 'false'),

    alias_statement: $ => seq(
      'alias',
      $.expression,
      'as',
      $.identifier,
    ),

    function_definition: $ => seq(
      repeat1($.function_header),
      repeat($.statement),
    ),

    // `script Name #N:` — all three parts are required; the compiler always
    // requires the jump-table slot number.
    function_header: $ => seq(
      'script',
      field('name', $.identifier),
      '#',
      field('slot', $.number),
      ':',
    ),

    action_definition: $ => seq(
      'action',
      field('name', $.identifier),
      repeat($.movement_statement),
      'EndMovement',
    ),

    movement_statement: $ => seq(
      field('command', $.identifier),
      optional($.expression),
    ),

    // Bare top-level label: `LabelName:` followed by body (private helper,
    // no jump-table entry). Only identifier names are valid here; local
    // labels (.name) only appear as statements inside a function body.
    label_definition: $ => seq(
      field('name', $.identifier),
      ':',
      repeat($.statement),
    ),

    local_label: $ => /\.[A-Za-z_][A-Za-z0-9_]*/,

    statement: $ => choice(
      $.command_statement,
      $.if_statement,
      $.while_statement,
      $.match_statement,
      $.jump_statement,
      $.break_statement,
      $.return_statement,
      $.end_statement,
      $.alias_statement,
      $.local_label_definition,
    ),

    command_statement: $ => seq(
      field('name', $.identifier),
      optional(choice(
        $.argument_list,
        $.call_argument_list,
      )),
    ),

    // Space-separated args: `CommandName arg1, arg2`
    argument_list: $ => seq(
      $.expression,
      repeat(seq(',', $.expression)),
    ),

    // Call-style args: `CommandName(arg1, arg2)`. Precedence over
    // parenthesized_expression: when `(` follows a command name, it always
    // starts a call-style arg list, never a parenthesized expression arg.
    call_argument_list: $ => prec(1, seq(
      '(',
      optional(seq($.expression, repeat(seq(',', $.expression)))),
      ')',
    )),

    if_statement: $ => seq(
      'if',
      $.expression,
      'then',
      repeat($.statement),
      optional($.else_clause),
      'endif',
    ),

    else_clause: $ => seq(
      'else',
      repeat($.statement),
    ),

    while_statement: $ => seq(
      'while',
      $.expression,
      'do',
      repeat($.statement),
      'endwhile',
    ),

    match_statement: $ => seq(
      'match',
      $.expression,
      'with',
      repeat($.match_case),
      optional($.match_default),
      'endmatch',
    ),

    // `case` accepts one or more comma-separated values before the colon.
    match_case: $ => seq(
      'case',
      $.expression,
      repeat(seq(',', $.expression)),
      ':',
      repeat($.statement),
    ),

    match_default: $ => seq(
      'else',
      ':',
      repeat($.statement),
    ),

    jump_statement: $ => seq(
      'Jump',
      choice($.identifier, $.local_label),
    ),

    break_statement: $ => 'break',

    return_statement: $ => 'Return',

    end_statement: $ => 'End',

    // Local label as a statement inside a function body: `.name:`
    local_label_definition: $ => seq(
      $.local_label,
      ':',
    ),

    preprocessor_directive: $ => seq(
      '#',
      choice('include', 'define'),
      /[^\n]*/,
    ),

    expression: $ => choice(
      $.identifier,
      $.number,
      $.boolean,
      $.string,
      $.prefix_expression,
      $.infix_expression,
      $.parenthesized_expression,
    ),

    string: $ => seq(
      '"',
      repeat(choice(
        $.escape_sequence,
        /[^"\\]+/,
      )),
      '"',
    ),

    escape_sequence: $ => /\\"/,

    prefix_expression: $ => prec.left(1, seq(
      choice('not', '!', '-'),
      $.expression,
    )),

    infix_expression: $ => prec.left(1, seq(
      $.expression,
      choice('==', '!=', '<=', '>=', '<', '>', '&&', '||', '+', '-', '*'),
      $.expression,
    )),

    parenthesized_expression: $ => seq(
      '(',
      $.expression,
      ')',
    ),
  },
});
