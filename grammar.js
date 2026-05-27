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

  // Newlines terminate statements. If newlines are extras, `LockAll\nFadeScreenIn`
  // parses as one command with an argument instead of two commands.
  extras: $ => [
    /[ \t]+/,
    $.comment,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    [$.function_definition],
    [$.label_definition],
    [$.command_statement],
    [$.movement_statement],
    [$.function_header, $.command_statement],
  ],

  rules: {
    source_file: $ => repeat(choice(
      $._top_level_item,
      /\r?\n/,
    )),

    _top_level_item: $ => choice(
      $.alias_statement,
      $.function_definition,
      $.action_definition,
      $.label_definition,
      $.preprocessor_directive,
    ),

    _statement_or_blank: $ => choice($.statement, /\r?\n/),

    _movement_or_blank: $ => choice($.movement_statement, /\r?\n/),

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
      /\r?\n/,
    ),

    function_definition: $ => seq(
      $.function_header,
      /\r?\n/,
      repeat(seq($.function_header, /\r?\n/)),
      repeat($._statement_or_blank),
    ),

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
      optional(':'),
      /\r?\n/,
      repeat($._movement_or_blank),
      'EndMovement',
      /\r?\n/,
    ),

    movement_statement: $ => seq(
      field('command', $.identifier),
      optional($.expression),
      /\r?\n/,
    ),

    label_definition: $ => seq(
      field('name', $.identifier),
      ':',
      /\r?\n/,
      repeat($._statement_or_blank),
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

    command_statement: $ => prec.right(1, seq(
      field('name', $.identifier),
      optional(choice(
        $.argument_list,
        $.call_argument_list,
      )),
      /\r?\n/,
    )),

    // Comma-separated args on the same line: `CommandName arg1, arg2`
    argument_list: $ => seq(
      $.expression,
      repeat(seq(',', $.expression)),
    ),

    call_argument_list: $ => prec(1, seq(
      '(',
      optional(seq($.expression, repeat(seq(',', $.expression)))),
      ')',
    )),

    if_statement: $ => seq(
      'if',
      $.expression,
      'then',
      /\r?\n/,
      repeat($._statement_or_blank),
      optional($.else_clause),
      'endif',
      /\r?\n/,
    ),

    else_clause: $ => seq(
      'else',
      /\r?\n/,
      repeat($._statement_or_blank),
    ),

    while_statement: $ => seq(
      'while',
      $.expression,
      'do',
      /\r?\n/,
      repeat($._statement_or_blank),
      'endwhile',
      /\r?\n/,
    ),

    match_statement: $ => seq(
      'match',
      $.expression,
      'with',
      /\r?\n/,
      repeat($.match_case),
      optional($.match_default),
      'endmatch',
      /\r?\n/,
    ),

    match_case: $ => seq(
      'case',
      $.expression,
      repeat(seq(',', $.expression)),
      ':',
      /\r?\n/,
      repeat($._statement_or_blank),
    ),

    match_default: $ => seq(
      'else',
      ':',
      /\r?\n/,
      repeat($._statement_or_blank),
    ),

    jump_statement: $ => seq(
      'Jump',
      choice($.identifier, $.local_label),
      /\r?\n/,
    ),

    break_statement: $ => seq('break', /\r?\n/),

    return_statement: $ => seq('Return', /\r?\n/),

    end_statement: $ => seq('End', /\r?\n/),

    local_label_definition: $ => seq(
      $.local_label,
      ':',
      /\r?\n/,
    ),

    preprocessor_directive: $ => seq(
      '#',
      choice('include', 'define'),
      /[^\n]*/,
      /\r?\n/,
    ),

    expression: $ => choice(
      $.call_expression,
      $.identifier,
      $.number,
      $.boolean,
      $.string,
      $.prefix_expression,
      $.infix_expression,
      $.parenthesized_expression,
    ),

    call_expression: $ => prec(2, seq(
      field('function', $.identifier),
      '(',
      optional(seq($.expression, repeat(seq(',', $.expression)))),
      ')',
    )),

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
      choice('==', '!=', '<=', '>=', '<', '>', '&&', '||', 'and', 'or', '+', '-', '*'),
      $.expression,
    )),

    parenthesized_expression: $ => seq(
      '(',
      $.expression,
      ')',
    ),
  },
});
