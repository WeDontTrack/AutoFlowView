# Changelog

All notable changes to **Auto Flow View** are documented here. The project version in `package.json` should be updated with each release.

## 0.4.0

- **Parser correctness**: Comment-aware Java preprocessing now removes `// ...` and `/* ... */` (while preserving line numbers) before TestNG parsing, so commented-out `@Test`, `@Parameters`, method signatures, or `super.*()` calls are no longer rendered as real flow steps.
- **Release cleanup**: Removed temporary debug instrumentation (`diagnosticLog`, debug command, and debug setting) so no internal troubleshooting logs are shipped in general usage.

## 0.3.4

- **Inheritance (multi-module repos)**: Resolve parent types using Maven-style roots **walked upward from the active `.java` file** (`…/src/main/java`, `…/src/test/java`), then workspace-folder-relative paths, then `findFiles`. This fixes monorepos where the VS Code workspace folder is the repo root but sources live under e.g. `scenarios/src/main/java` — previously only `<workspace>/src/main/java` was tried, so superclass `@Test` methods stayed as empty stubs and layers looked wrong.
- **Diagnostics**: Setting `autoflowview.debugLogging` logs superclass walking and FQN resolution to **Output → Auto Flow View (debug)**. Command **Auto Flow View: Open Debug Log Output** reveals that panel.

## 0.3.3

- **Inheritance / flow layers**: Superclass sources are resolved with `resolveJavaUriForFqn` — `workspace.findFiles` first (limit raised to 2000), then direct paths under `src/main/java`, `src/test/java`, and the workspace folder. That restores real `@Test` metadata for methods like `createToken` and `retrieveCustomerProductsByAgreement` from parent types, so dependency edges and layer order match TestNG instead of showing them as unrelated “parallel” stubs with “not declared in merged inheritance”.
- **`extends` parsing**: `parseExtendsTypeName` uses the current file’s simple name (from the path) so a nested `class … extends …` in the same file does not override the outer type’s superclass.
- **Reliability**: Flow map keys use `path.normalize()` end-to-end; webview resolves flows with `getFlowForSelected()` (slash style + case-insensitive fallback) so `selectedPath` always matches `_flows` after analysis.
- **postMessage**: Payload is JSON round-tripped before sending so hosts that are strict about structured clone don’t drop updates; failures surface as an error notification instead of a silent blank preview.
- **Race**: A deferred second `postUpdate` (~250ms) after `loadJavaUris` reduces missed updates if the sidebar webview attaches listeners right after the first send.
- **Lifecycle**: `onDidDispose` clears `_view` so posts don’t target a disposed webview.
- **Webview**: Null-safe `#content` click binding; removed stray `origRowIndex++` (could break strict execution); `updateData` handler guards non-message payloads.
- **Commands**: “Show TestNG Flow for Active Editor” requires `scheme === 'file'` (not virtual/untrusted URIs).

## 0.3.2

- **Fix**: `loadJavaUris` no longer clears `_flows` / `_files` before async analysis finishes. Clearing first allowed any concurrent `postMessage` (e.g. webview `ready`, settings refresh) to push **empty** `flows` while `selectedPath` still pointed at the previous file, which showed “No @Test flow could be built” even though parsing succeeded.
- **Toolbar**: Search (opens a method-name field; closes on click-away or Escape), class filter dropdown, and **Refresh** to re-analyze the last loaded Java URIs from disk.
- **`super` calls**: Heuristic detection of `super.method(` in each `@Test` body (until the next `@Test` in the file); shown on each flow card when present.
- **Appearance**: Built-in color presets (`default`, `ocean`, `slate`, `rose`) plus optional per-element overrides via `autoflowview.colors.useCustom` and `autoflowview.colors.custom` in settings.

## 0.3.1

- **Marketplace / `vsce`**: Added HTTPS `repository` in `package.json` so README screenshots using relative `resources/images/...` paths validate when packaging.

## 0.3.0

- **Click-to-declaration**: Clicking a flow step (when a source location is known) opens the correct file and reveals the `@Test` method line; temporary whole-line decoration on that line only.
- **Data model**: Each node carries `sourceFilePath` (from primary file or resolved superclass files) for navigation.
- **Docs**: README / documentation split; changelog maintained here.

## 0.2.0

- **Parallel layers**: Rows group tests by dependency depth; multiple tests in one row show an amber “parallel” banner (no `dependsOnMethods` between them).
- **Inheritance**: Walks `extends`, loads superclass `.java` files from the workspace, merges `@Test` methods (subclass overrides).
- **Declaring class**: External/inherited methods show the simple class name (e.g. `TokenCreation` for `createToken`).
- **Setting**: `autoflowview.syncPreviewWithActiveEditor` for automatic preview refresh on active editor change / save.

## 0.1.0

- Initial release: parse `@Test`, `dependsOnMethods`, `@Parameters`; topological / layered visualization; FlowRunner-style preview; folder or file selection.
