---
name: rust-patterns
description: Idiomatic Rust for src-tauri/ — ownership, Result/?, and safe error handling.
origin: ECC
---

# Rust Patterns (Tauri)

> On conflict, follow [docs/build-and-release.md](../../../docs/build-and-release.md) and existing `src-tauri/` conventions.

## When to use

- Editing `src-tauri/**/*.rs`
- Reviewing Tauri commands, OAuth loopback, or desktop FS helpers

## Core principles

### Ownership

- Pass `&[u8]` / `&str` when you do not need ownership; take `Vec` / `String` only when storing.
- Avoid cloning to appease the borrow checker when a reference suffices.

### Errors

- Use `Result` and `?` in command handlers — avoid `unwrap()` / `expect()` in production paths.
- Add context with `.context()` / `.with_context()` when using `anyhow`.
- Return typed errors from library-style modules when callers need to branch.

```rust
// Good
fn read_config(path: &str) -> anyhow::Result<Config> {
    let text = std::fs::read_to_string(path)
        .with_context(|| format!("read config {path}"))?;
    Ok(toml::from_str(&text)?)
}
```

### Concurrency

- Prefer `Arc<Mutex<T>>` or channels when sharing state across async tasks.
- Do not block the Tauri main thread on long I/O — use async commands where the crate already does.

### Surface area

- Keep `pub` minimal; organize by domain (commands, oauth, fs).

## Desktop specifics

- OAuth secrets stay in Worker/env — never hardcode client secrets in Rust.
- Paths use Tauri FS APIs; classroom JSON identity matches web desktop migration rules in `AGENTS.md`.

## Skip

- TDD / 80% coverage mandates unless the user asks
- Refactoring unrelated crates or adding new Rust dependencies without need
