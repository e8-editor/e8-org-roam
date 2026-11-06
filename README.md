# e8-org-roam

A network of notes for [E8](https://github.com/e8-editor/e8): every Org file in a directory, and every heading in one that has an ID, is a node; nodes link to each other with `[[id:...]]` links, are found and made by their titles, and show the notes that link to them. A port of [org-roam](https://github.com/org-roam/org-roam) 2.3.1.

## Installing

In `~/.config/e8/init.ts`:

```ts
e8.usePackage("e8-editor/e8-org-roam");
e8.setVariable("org-roam-directory", "~/notes/");
e8.call("org-roam-db-autosync-mode");
e8.defineKey("global-map", "C-c n f", "org-roam-node-find");
e8.defineKey("global-map", "C-c n i", "org-roam-node-insert");
e8.defineKey("global-map", "C-c n l", "org-roam-buffer-toggle");
```

E8 installs it, and [e8-magit-section](https://github.com/e8-editor/e8-magit-section), which it needs, at their newest version tags into `repos/` beside `init.ts`, records the commits in `e8-lock.json`, and requires it. `M-x package-vc-upgrade` brings it up to date. Pin a version with `{ rev: "v0.1.0" }`. It needs E8 0.3.1 or newer.

The keys are only a suggestion: org-roam binds none of its own.

## Using it

A node is a file with an `:ID:` in a property drawer at its top, titled by its `#+title:`, or a heading with an `:ID:` in its drawer. `:ROAM_ALIASES:` gives a node other titles, `:ROAM_REFS:` the references it stands for, and `#+filetags:` and a heading's tags its tags. `M-x org-id-get-create`, which comes with E8, gives the file or heading at point an ID.

| Command | Does |
| --- | --- |
| `org-roam-node-find` | Visit a node chosen by its title or an alias; a title no node has makes a new note. With `C-u`, in another window. |
| `org-roam-node-insert` | Insert a link to a node chosen, or to a new note; an active region is the link's text and the title to look for. |
| `org-roam-capture` | Add to a node chosen, or to a new note, from a capture template. |
| `org-roam-buffer-toggle` | Show the backlinks of the node at point in a window beside it, each with the paragraph it is in, following point; or hide them. `RET` there visits a node or the place a link is. |
| `org-roam-buffer-display-dedicated` | Show the backlinks of a node chosen in a buffer of their own. |
| `org-roam-node-random` | Visit a node at random. |
| `org-roam-alias-add`, `org-roam-alias-remove` | Change the aliases of the node at point. |
| `org-roam-ref-add`, `org-roam-ref-remove` | Change its refs. |
| `org-roam-tag-add` | Add a tag to it. |
| `org-roam-db-sync` | Bring the index up to date with the notes; with `C-u`, read every note again. |
| `org-roam-db-autosync-mode` | Keep the index up to date as notes are saved. |
| `org-roam-graph` | Draw the nodes and their links with Graphviz's `dot`, and show the SVG. |

A capture buffer, from `org-roam-node-find`, `-node-insert` or `-capture`, is finished with `C-c C-c` and aborted with `C-c C-k`, Org's own capture keys, which still finish and abort Org's captures too. Finishing saves the note; aborting a new note deletes its file.

Variables:

- `org-roam-directory`: where the notes are, searched recursively, hidden files and directories left out (`~/org-roam/`).
- `org-roam-file-extensions` (`["org"]`) and `org-roam-file-exclude-regexp` (`["data/"]`): which files under it are notes.
- `org-roam-db-location`: the file the index is kept in, `org-roam.json` in `user-emacs-directory`.
- `org-roam-db-update-on-save`: whether saving a note updates the index (true).
- `org-roam-node-display-template`: how nodes show when choosing one, `${title}` and the like, each with a width or `*` for the rest: `${title}`, `${tags}`, `${file}`, `${olp}`, `${todo}`, `${aliases}`, `${level}`.
- `org-roam-capture-templates`: templates for captures, each `[key, description, type, template, target]`, the target `["file+head", file name, head]`. In the template, file name and head, `${title}`, `${slug}` and `${id}` are the node's, `%<...>` a time as `format-time-string` writes it, `%U`, `%u`, `%T` and `%t` timestamps, and `%?` where point is left. The default makes `YYYYMMDDHHMMSS-slug.org` with a `#+title:`.
- `org-roam-capture-new-node-hook` and `org-roam-find-file-hook`.

An `[[id:...]]` link to any node in the directory is followed from anywhere with `org-open-at-point` (`C-c C-o`), as org-roam does by telling `org-id` where its IDs are.

## Differences from org-roam

- The index is not an SQLite database: it is JSON in `org-roam-db-location`, each file's nodes and links, read again only for files changed since. So there is no `org-roam-db-query`, and nothing else can query the index with SQL. `org-roam-db-sync` lists the notes with `find`.
- Notes are read by their text, line by line, rather than with Org's parser: headings, property drawers, `#+title:`, `#+filetags:`, tags, TODO keywords from a fixed set, and `[[id:...]]` links. Links of other types, citations, and `roam:` links are not indexed.
- Capture templates are lists rather than `org-capture`'s plists, the capture buffer is the note's own rather than an indirect one, and the template's type and the targets other than `file+head` and a plain file are not used.
- The Org-roam buffer shows backlinks and reflinks, not unlinked references.
- Not there yet: dailies, `org-roam-refile`, `org-roam-extract-subtree`, `org-roam-tag-remove`, `org-roam-ref-find`, link completion (`org-roam-complete-everywhere`), `org-roam-link-replace-all`, `org-roam-promote-entire-buffer` and `-demote-`, org-roam-protocol, org-roam-export and org-roam-overlay, and the sorting functions for `org-roam-node-read`: nodes are listed most recently changed first.
- `org-roam-graph` draws every node, without `org-roam-graph-exclude-matcher` and the other options.

## Credit

This is a port to E8 of [org-roam](https://github.com/org-roam/org-roam) 2.3.1, by Jethro Kuan and its contributors, copyright Jethro Kuan, and distributed in MELPA, under the GNU General Public License version 3 or later. It is not the upstream authors' work as published, and they do not endorse it: report problems with the port here, not upstream.

## Developing

With an E8 on your PATH (a [release](https://github.com/e8-editor/e8/releases), or built from source) and TypeScript 5.8 or newer:

```bash
make test
make types
```

Both clone the packages it needs, e8-magit-section and, for the tests, e8-vertico, into `.e8/deps`, which git ignores. The tests in `test/org-roam-tests.ts` make a directory of notes for each test and check that `org-roam-node-find` finds nodes by title and alias and makes new notes, that `org-roam-node-insert` links to a node, what `org-roam-buffer-toggle` shows, that `id:` links are followed, that `org-id-get-create` gives a heading or a file an ID, and that `C-c C-c` and `C-c C-k` still finish and abort Org's own captures.

## Licence

GPL-3.0-or-later: see `LICENSE`.
