# Recall

An Obsidian plugin that indexes, highlights, and organizes **Task** and **Reminder** designations across your vault, surfacing them in a dedicated side pane.

---

## Syntax

### Tasks

Tasks must be written as checkbox list items with the exact `Task::` keyword.

```md
- [ ] Task:: Draft sermon outline
- [x] Task:: Submit timesheet
- [ ] Task:: Renew license plates | due: 2026-04-20
```

**Rules:**
- Keyword is case-sensitive: `Task::` only
- Must be a Markdown checkbox item (`- [ ]` or `- [x]`)
- Optional due date using the `| due: YYYY-MM-DD` suffix
- Completed tasks (`[x]`) are detected but hidden in the pane by default

### Reminders

Reminders are plain lines — no checkbox required.

```md
Reminder:: Call the dentist
Reminder:: Follow up on insurance paperwork
```

**Rules:**
- Keyword is case-sensitive: `Reminder::` only
- Must appear at the very start of the line
- No checkbox syntax

---

## Features

### Highlighting

`Task::` and `Reminder::` keywords are highlighted in both the **live editor** and **reading view**. Colors are configurable per designation type in Settings.

### Side Pane

Open the Recall pane via the ribbon bookmark icon or the command palette. It contains two sections:

**Tasks**
- Completed tasks are hidden by default (toggle with the "Show completed" button or the command)
- Tasks with due dates appear first, sorted ascending by date
- Overdue tasks are marked in red
- Remaining tasks are grouped by file with a subtle separator
- Completed tasks render with a strikethrough

**Reminders**
- Grouped by file, sorted by filename then line order

Clicking any item opens the source file and jumps to the exact line.

### Live Index

The vault is indexed on startup and kept up to date automatically as you work:

| Event | Behavior |
|---|---|
| File created | Indexed immediately |
| File modified | Re-indexed after a 400ms debounce |
| File renamed | Old path removed, new path indexed |
| File deleted | Removed from index |

---

## Settings

| Setting | Description | Default |
|---|---|---|
| **Scope** | Search entire vault or a specific folder | Entire vault |
| **Folder path** | Vault-relative path scoped recursively (e.g. `Notes/Work`) | — |
| **Task highlight color** | Accent color for `Task::` | Orange |
| **Reminder highlight color** | Accent color for `Reminder::` | Blue |
| **Show completed tasks by default** | Show `[x]` tasks when the pane opens | Off |

The settings tab also shows live index stats and a **Rebuild index** button for forcing a full re-scan.

---

## Commands

| Command | Description |
|---|---|
| `Recall: Open designation pane` | Open or reveal the Recall side pane |
| `Recall: Rebuild index` | Re-scan the vault from scratch |
| `Recall: Toggle completed tasks in pane` | Show/hide completed tasks without opening settings |

---

## Installation

1. Copy the plugin folder into your vault's `.obsidian/plugins/recall/` directory
2. Run `npm install` then `npm run build` to produce `main.js`
3. Enable the plugin in **Settings → Community plugins**

For active development, use `npm run dev` to watch for changes and rebuild automatically.

---

## Limitations

- Highlighting in reading view replaces text nodes directly; very large files may have a brief rendering delay
- Folder scope uses a prefix match on the file path — renaming a scoped folder requires updating the setting and rebuilding the index
- Due dates are compared as plain strings (`YYYY-MM-DD`), so the format must be exact

---

## Extending Recall

The parser system is designed to be extensible. To add a new designation type (e.g. `Event::`):

1. **Add a type** in `src/types/index.ts` — extend `BaseDesignation` and add the new literal to `DesignationType`
2. **Write a parser** in `src/parser/` — implement the `DesignationParser` interface
3. **Register it** in `src/parser/index.ts` by calling `this.register(new EventParser())` in the `ParserRegistry` constructor
4. **Add a section** to `src/views/designationView.ts` by following the pattern of `renderTasksSection` or `renderRemindersSection`
5. **Add a highlight rule** in `styles.css` using the new CSS class and a corresponding CSS variable
