# file-wizard

A small CLI for **bulk file work** in the current directory: rename paths, delete files, and create empty files—by editing a single text manifest instead of running many shell commands.

## What it does

1. **First run** — Walks the tree under the current working directory (recursive), lists every file as a numbered line, and writes two copies of that list:
   - `.file-wizard` — **edit this file** to describe the changes you want.
   - `.file-wizard.lock` — **leave unchanged**; it is the snapshot the tool compares against.

2. **Second run** — If both files exist, file-wizard **applies** the diff between the lock file and your edited file, then removes both wizard files.

Operations are inferred from how the two maps differ:

| Change        | Meaning                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rename**    | Same line number (key), but the path after `:` is different → file is moved/renamed to the new path (parent directories are created when needed). |
| **Delete**    | A line that existed in the lock snapshot is **removed** from `.file-wizard` → that file is deleted.                                               |
| **Create**    | A **new** line number appears only in `.file-wizard` (not in the lock) → an empty file is created at that path.                                   |
| **Unchanged** | Same key and same path → nothing happens for that entry.                                                                                          |

Paths are **relative to the directory where you run the command**.

## Installation

```bash
# Install from the github repository
npm install -g https://github.com/alschussler/file-wizard.git --install-links
```

The executable entry in `package.json` is `lib/index.js`, so anything that runs that file after `npm run build` is equivalent.

## Workflow

```text
cd your/project
file-wizard    # creates .file-wizard and .file-wizard.lock
# Edit .file-wizard only: renumber/rename paths, remove lines to delete, add new "N: relative/path" lines to create files
file-wizard    # applies changes, deletes both wizard files
```

### Line format

Each non-empty line should look like:

```text
<number>: <relative/path>
```

Example snippet:

```text
1: src/old-name.ts
2: README.md
```

After editing for a rename and a new file you might have:

```text
1: src/new-name.ts
2: README.md
3: docs/notes.md
```

Malformed lines (missing key or path) are skipped with a warning.
