# Auto Flow View

A **Visual Studio Code extension** that draws a **visual flow** of TestNG-style Java tests: which `@Test` methods run in what order, how they depend on each other, and where parameters and inherited steps come from—without reading hundreds of lines by hand.

## What it does

- Reads `.java` sources in your workspace and builds a **directed graph** from `@Test` and `dependsOnMethods`.
- **Layers** methods by dependency depth so you can spot **parallel groups** (tests with no ordering between them in the same layer).
- Follows **`extends`** to pull in superclass `@Test` methods and shows the **declaring class** for each step.
- Lets you **click a step** to open the file and highlight the **method declaration line**.

Inspired by a “flow preview” workflow (similar in spirit to FlowRunner-style UIs): one place to see the scenario at a glance.

## Screenshots

![Auto Flow activity bar and TestNG Flow Preview](resources/images/image.png)

![Layered TestNG flow with steps, parameters, and inheritance](resources/images/image2.png)

## Who it’s for

Teams using **TestNG** with `dependsOnMethods` chains in Java flow/scenario classes (e.g. API E2E flows). It is a **heuristic** viewer, not a full Java compiler—see [documentation.md](documentation.md) for limits.

## Quick start

1. Install the extension (from a packaged `.vsix` or by running from source—see below).
2. Open your Java project in VS Code.
3. Open the **Auto Flow** activity bar and the **TestNG Flow Preview** view, or run **Auto Flow View: Open TestNG Flow Diagram** and pick a `.java` file or folder.
4. Use the dropdown if you analyzed multiple files; click a card to jump to code.
5. Use **Search…** to filter cards by method name substring, **All classes** to narrow by declaring class, and **Refresh** after you edit sources on disk.

## Installation

1. Download the vsix file from releases folder (recommended to download latest version)
2. Drag and drop this vsix file into extension sidebar
3. Restart extensions

## Commands

| Command | What it does |
|--------|----------------|
| **Open TestNG Flow Diagram** | Choose a `.java` file or folder; all `*.java` under a folder are analyzed. |
| **Show TestNG Flow for Active Editor** | Analyze the Java file currently focused in the editor. |

## Configuration

| Setting | Description |
|--------|-------------|
| `autoflowview.syncPreviewWithActiveEditor` | When `true`, refreshes the preview when you switch to a `.java` editor or save (debounced). Default: `false`. |
| `autoflowview.colors.preset` | Built-in palette: `default`, `ocean`, `slate`, or `rose`. |
| `autoflowview.colors.useCustom` | When `true`, non-empty keys in `autoflowview.colors.custom` override the preset for those UI elements (hex `#rgb` / `#rrggbb`). |
| `autoflowview.colors.custom` | Object map of optional color keys (see `package.json` / settings UI descriptions). |

## Development

```bash
npm install
npm run compile
```

Open this folder in VS Code and press **F5** to launch the **Extension Development Host**.

- **Full documentation**: [documentation.md](documentation.md)
- **Version history**: [CHANGELOG.md](CHANGELOG.md)

## Requirements

- VS Code **1.85+** (see `engines` in `package.json`).
- Workspace should contain the `.java` files you analyze (superclass resolution uses workspace search).


## Contact

- For any issues/queries/feature request - please raise issue on [AutoFlowView](https://github.com/WeDontTrack/AutoFlowView) repo