use tree_sitter_language::LanguageFn;

extern "C" {
    fn tree_sitter_rotom() -> tree_sitter::Language;
}

/// Returns the tree-sitter Language for Rotom.
pub const LANGUAGE: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_rotom) };
