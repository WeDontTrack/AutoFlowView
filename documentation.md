# Auto Flow View — Complete guide

**Product:** Visual Studio Code extension **Auto Flow View**  
**Audience:** Developers and test engineers who maintain **TestNG** Java flow / scenario classes.

---

## How to use this document in OneNote

- **Copy/paste:** You can paste this entire file into a OneNote page (headings will often map to outline levels depending on paste source).  
- **Images:** Screenshots live in the repo under `resources/images/` (`image.png`, `image2.png`). Attach them manually in OneNote, or paste captures from your own VS Code.  
- **Share as a link:** If the Markdown is in **GitHub / GitLab / Azure DevOps**, share the **browser link** to the file so everyone sees the same version. Raw Markdown URLs also work for technical readers.

---

# Part A — What it is and why it exists

## A.1 What is Auto Flow View?

**Auto Flow View** is a VS Code extension that turns long Java TestNG scenario files into a **visual flow diagram** in the side bar. It reads `@Test`, `dependsOnMethods`, `@Parameters`, and **superclass inheritance** (`extends`) so you can see **order**, **dependencies**, **parameters**, and **where each step is declared**—without scrolling through hundreds of lines every time.

It is a **companion** to your IDE and TestNG: it helps **read and navigate** flow code; it does **not** run tests or replace the compiler.

## A.2 Problems it tries to solve


| Problem                                                                                    | How Auto Flow View helps                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Hard to see execution order** when `dependsOnMethods` chains many methods                | Builds a **layered diagram**: earlier layers complete before later ones (by dependency depth).                                                                 |
| **Hidden parallel risk** — two tests don’t depend on each other but sit in the same “wave” | **Parallel layer banner** when multiple methods share a layer **without** a `dependsOnMethods` link between them—so you can review ordering.                   |
| **Steps live in base classes** (e.g. token creation, shared setup)                         | Walks `**extends`**, loads superclass `.java` files from the workspace, **merges** those `@Test` methods, and shows the **declaring class name** on each card. |
| **Parameter keys** (`@Parameters`) easy to miss next to a test                             | Shows **Params** badges with the keys on methods that have `@Parameters` + `@Test`.                                                                            |
| **Slow navigation** — find method in another file or line                                  | **Click a step** → opens the right `.java` file, jumps to the **method declaration line**, short highlight.                                                    |
| **Multiple scenario files** in one folder                                                  | Can analyze a **folder** (all `*.java` recursively) and **switch** between files via a **dropdown** in the preview.                                            |
| **Stale mental model** after refactors                                                     | Re-run analysis from the command or enable **optional auto-sync** when editing/saving.                                                                         |


## A.3 Who it is for

- Teams using **TestNG** with `**@Test`** and `**dependsOnMethods`** in Java.  
- Flows structured as **class hierarchies** (child scenario extends shared base flow).  
- Anyone who needs a **quick map** of a scenario before code review, debugging, or onboarding.

## A.4 What it is *not*

- **Not** a replacement for TestNG’s runtime or for IDE “Find references.”  
- **Not** a full Java semantic analyzer (it uses **heuristic** parsing—see Part G).  
- **Not** focused on JUnit or other frameworks in the current version.

---

# Part B — Feature list (complete)


| #   | Feature                      | Description                                                                                                                                 |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **TestNG `@Test` discovery** | Finds method-level `@Test` annotations in `.java` sources.                                                                                  |
| 2   | `**dependsOnMethods` graph** | Reads single or array form; builds dependencies between named methods.                                                                      |
| 3   | `**@Parameters` display**    | When `@Parameters` appears above `@Test`, extracts string keys and shows them on the card.                                                  |
| 4   | `**description` (optional)** | Shows TestNG `description` from `@Test` when present (helps identify steps).                                                                |
| 5   | **Layered layout**           | Rows = dependency depth; **↓** between rows.                                                                                                |
| 6   | **Parallel layer warning**   | Amber-style banner when **two or more** methods share a layer without depending on each other in the graph.                                 |
| 7   | **Superclass merge**         | Resolves `extends`, finds parent `.java` files in the **workspace**, merges their `@Test` methods; subclass **overrides** same method name. |
| 8   | **Declaring class label**    | Shows which class declares a step (e.g. base `TokenCreation` vs leaf scenario).                                                             |
| 9   | **External / stub nodes**    | If `dependsOnMethods` names a method not found in merged sources, a placeholder node still appears so the chain is visible.                 |
| 10  | **Cycle detection**          | If `dependsOnMethods` forms a cycle, a warning is shown; ordering may be partial.                                                           |
| 11  | **Click → navigate**         | Opens file, selects declaration line, **whole-line highlight** (~3.5s).                                                                     |
| 12  | **Multi-file analysis**      | Pick a folder → all `*.java` collected; **dropdown** to switch flows.                                                                       |
| 13  | **Active editor command**    | Analyze only the file currently open in the editor.                                                                                         |
| 14  | **Optional sync**            | Setting to refresh preview on **tab change** or **save** (debounced).                                                                       |


---

# Part C — Installation and first use

## C.1 Prerequisites

- **Visual Studio Code** version **1.85** or newer (see `package.json` `engines`).  
- Your **workspace** must contain the `.java` files you analyze (superclasses are found via **workspace search**).

## C.2 Install the extension

- Install from a `**.vsix`** supplied by your team, or from your **internal marketplace**, following your org’s process.

## C.3 Open the tool

1. Open your **Java project** folder in VS Code.
2. Click the **Auto Flow** icon in the **activity bar** (left).
3. Open the **TestNG Flow Preview** view (side bar).

## C.4 Run your first analysis

**Option A — Current file**

1. Open a `.java` flow class.
2. **Command Palette** (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Auto Flow View: Show TestNG Flow for Active Editor**.

**Option B — Pick file or folder**

1. Command Palette → **Auto Flow View: Open TestNG Flow Diagram**.
2. Choose a `**.java` file** or a **folder** (all `*.java` under it are analyzed).

## C.5 Using the result

- Scroll the preview: **layers**, **parallel** banners (if any), **cards**.  
- Use the **dropdown** at the top if multiple files were analyzed.  
- **Click** a card (when the hand cursor appears) to jump to that method’s declaration.

---

# Part D — Understanding the UI

## D.1 Activity bar and view

- **Auto Flow** — entry point in the activity bar.  
- **TestNG Flow Preview** — webview panel showing the diagram.

## D.2 Cards

- **Local / primary file** methods: one visual style (e.g. blue accent).  
- **Inherited / external** methods: another style; includes **declaring class** name when known.  
- **Params:** small badges for `@Parameters` keys.  
- **Line number** and **description** text when available.

## D.3 Layers and arrows

- Each **row** is a **layer** in the dependency sense: everything in a row depends (directly or transitively) on rows **above**.  
- **↓** suggests “after previous layers” in that ordering—not TestNG’s internal scheduler details.

## D.4 Parallel banner

- Shown when **more than one** test appears in the **same layer** **and** there is **no** `dependsOnMethods` edge between them in our graph.  
- **Use it to review:** you may want an explicit dependency if order must be strict.

## D.5 Screenshots (repository)

Auto Flow activity bar and TestNG Flow Preview

*Figure 1 — Activity bar entry and TestNG Flow Preview.*

Layered TestNG flow diagram

*Figure 2 — Example layered flow with steps and metadata.*

---

# Part E — Commands and settings

## E.1 Commands (Command Palette)


| Display name                                           | Purpose                                              |
| ------------------------------------------------------ | ---------------------------------------------------- |
| **Auto Flow View: Open TestNG Flow Diagram**           | File/folder picker; loads one or many `.java` flows. |
| **Auto Flow View: Show TestNG Flow for Active Editor** | Analyzes the active editor’s `.java` file.           |


**Command IDs** (for `keybindings.json`):

- `autoflowview.openFlowDiagram`  
- `autoflowview.openFlowDiagramFromActiveFile`

## E.2 Settings


| Setting                                    | Default | Meaning                                                                                                                                                                   |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autoflowview.syncPreviewWithActiveEditor` | `false` | When `**true`**, the preview reloads when you switch to a `.java` editor or save the active file (debounced, ~450 ms). Use `**false`** if you prefer manual refresh only. |


**Path:** VS Code **Settings** → search **Auto Flow View**.

---

# Part F — Performance and usability

## F.1 Performance (what to expect)

- **Parsing** is **lightweight** (line/regex-based), suitable for typical scenario files.  
- **Inheritance** uses **workspace-wide file search** per superclass; very deep chains or **huge** workspaces can add delay.  
- **Folder analysis** processes files **sequentially**; picking a **single file** or a **small folder** is fastest when you only need one flow.  
- **Auto-sync** is **off by default** to avoid re-parsing on every tab switch; turn it on only when you want live updates.

## F.2 Usability

- **Side-by-side** with the editor: keep the preview open while editing.  
- **One click** to source reduces context switching.  
- **Parallel** and **class** labels answer common questions in **review** and **onboarding** without reading the whole file.

---

# Part G — Limitations and known issues


| Area                  | Limitation                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Parsing**           | Heuristic, not a full Java AST. Odd formatting, generated code, or `@Test`-like text inside strings/comments can mislead the scanner (rare in normal flows). |
| **Method signatures** | Expects common `void methodName(` patterns; unusual signatures may not link cleanly.                                                                         |
| **Superclasses**      | Only `.java` files **discoverable in the workspace** are merged. Dependencies on classes **outside** the workspace appear as **stubs** or missing detail.    |
| **TestNG semantics**  | **Parallel** layers indicate **no `dependsOnMethods` link** in our graph—not a guarantee of TestNG’s parallel execution or thread behavior.                  |
| **Frameworks**        | Optimized for **TestNG**; JUnit and others are **not** modeled in this version.                                                                              |
| **Scale**             | Very large folder selections or monorepos may feel slow; prefer **scoped** selection.                                                                        |


---

# Part H — Troubleshooting


| Symptom                                    | What to try                                                                                               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Empty or almost empty graph                | Confirm method-level `@Test`; check that `void` method names match `dependsOnMethods` strings.            |
| Missing base-class steps                   | Ensure parent `.java` files are **in the workspace** and `extends` / **imports** resolve.                 |
| Wrong file on click                        | Save files and re-run analysis; check that the method exists in merged sources.                           |
| Preview updates too often                  | Set `autoflowview.syncPreviewWithActiveEditor` to `**false`**.                                            |
| `vsce package` / Marketplace README images | `package.json` should include an `**https://` `repository.url`** if README uses **relative** image paths. |


---

# Part I — FAQ

**Q: Does it run my tests?**  
A: No. It only **reads** sources and shows structure.

**Q: Is the parallel banner always a bug?**  
A: No. It means “no dependency edge between these in the diagram”—**review** whether you need a stricter order.

**Q: Can I use it without opening the activity bar?**  
A: Yes—use the **Command Palette** commands anytime.

**Q: Is there an IntelliJ version?**  
A: A sibling project **autoFlowView-Intellij** targets JetBrains IDEs with similar concepts.

---

# Part J — Technical summary (for engineers)

- **Parser:** line-oriented + regex for `@Test`, `dependsOnMethods`, `@Parameters`, method name.  
- **Inheritance:** `package` / `import` / `extends` → FQN → `**/ClassName.java` workspace search → merge + override rules.  
- **Graph:** nodes + edges → topological order + **layer indices** for layout.  
- **Navigation:** `sourceFilePath` + line → `openTextDocument` + selection + decoration.

---

# Appendix — Document history

Release notes are maintained in `**CHANGELOG.md`** in the same repository as this file.

---

*End of document.*