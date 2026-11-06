// SPDX-License-Identifier: GPL-3.0-or-later
//
// org-roam's tests, with ERT: notes found by their titles, linked by ID,
// captured, and their backlinks shown, in a notes directory of their own
// made for each test. They read nodes with vertico, as E8's own tests of
// the port did, and see what it lists in the minibuffer's overlays.
// `make test` runs them in e8 --batch, as CI does.

import { ertDeftest, should, shouldEqual } from "ert";
import "vertico";
import "org-roam";

const ALPHA = ":PROPERTIES:\n:ID:       alpha-id\n:END:\n#+title: Alpha\n#+filetags: :one:\n\nAlpha mentions [[id:beta-id][Beta]] here.\n";
const BETA = "#+title: Notes\n\n* Beta\n:PROPERTIES:\n:ID:       beta-id\n:ROAM_ALIASES: \"Second letter\"\n:END:\nBeta's text.\n* Not a node\n";

e8.callWithPrefix(1, "vertico-mode" as e8.DefinedCommand);
e8.callWithPrefix(1, "org-roam-db-autosync-mode" as e8.DefinedCommand);

/** TEXT as keys typed one by one, spaces as SPC. */
const spell = (text: string): string => [...text].map((c) => (c === " " ? "SPC" : c)).join(" ");

/**
 * Runs BODY with a notes directory holding alpha.org and beta.org as
 * org-roam-directory, its index brought up to date, and afterwards kills
 * the buffers of its files and deletes it.
 */
function withNotes(body: (dir: string) => void): void {
  const dir = e8.makeTempFile("org-roam-tests", { dir: true });
  e8.writeTextFile(`${dir}/alpha.org`, ALPHA);
  e8.writeTextFile(`${dir}/beta.org`, BETA);
  const saved = { directory: e8.variable("org-roam-directory") ?? null, db: e8.variable("org-roam-db-location") ?? null };
  e8.setVariable("org-roam-directory", `${dir}/`);
  e8.setVariable("org-roam-db-location", `${dir}/.cache.json`);
  e8.call("org-roam-db-sync" as e8.DefinedCommand);
  try {
    body(dir);
  } finally {
    e8.call("delete-other-windows");
    for (const b of e8.bufferList()) {
      const file = e8.withCurrentBuffer(b, () => e8.bufferFileName());
      if (file?.startsWith(`${dir}/`) || b === "*org-roam*") {
        e8.withCurrentBuffer(b, () => e8.setBufferModified(false));
        e8.call("kill-buffer", b);
      }
    }
    e8.call("switch-to-buffer", "*scratch*");
    e8.setVariable("org-roam-directory", saved.directory);
    e8.setVariable("org-roam-db-location", saved.db);
    e8.deleteDirectory(dir, { recursive: true });
  }
}

/** What vertico shows below the input: the after-strings of the minibuffer's overlays ending at its end. */
function minibufferStrings(): string {
  const end = e8.pointMax();
  return e8
    .overlaysIn(e8.pointMin(), end + 1)
    .filter((o) => e8.overlayEnd(o) === end)
    .sort((a, b) => Number(e8.overlayGet(a, "priority") ?? 0) - Number(e8.overlayGet(b, "priority") ?? 0) || a - b)
    .map((o) => {
      const s = e8.overlayGet(o, "after-string");
      return typeof s === "string" ? s : s && typeof s === "object" && "string" in s ? String(s.string) : "";
    })
    .join("");
}

/**
 * Types KEYS, which may open prompts and must answer them, giving what the
 * minibuffer lists under PROMPT after the first command run there: a key
 * such as C-e that changes nothing shows what the prompt lists at first.
 */
function shownAt(prompt: string, keys: string): string {
  let shown: string | undefined;
  const watch = () => {
    if (shown === undefined && e8.minibufferDepth() > 0 && e8.bufferText(e8.pointMin(), e8.minibufferPromptEnd()) === prompt) shown = minibufferStrings();
  };
  e8.addHook("post-command-hook", watch);
  try {
    e8.executeKbdMacro(keys);
  } finally {
    e8.removeHook("post-command-hook", watch);
  }
  should(shown !== undefined, `the prompt ${JSON.stringify(prompt)} opened`);
  return shown!;
}

/** Keys that run COMMAND, as M-x does. */
const mx = (command: string): string => `M-x ${spell(command)} RET`;

const lineAtPoint = (): number => e8.lineOf(e8.point());

ertDeftest("org-roam-node-find-visits-a-node-by-title-or-alias", () =>
  withNotes(() => {
    const shown = shownAt("Node: ", `${mx("org-roam-node-find")} C-e S e c o n d RET`);
    should(shown.includes("Alpha") && shown.includes("Beta") && shown.includes("Second letter"), `every node and alias: ${JSON.stringify(shown)}`);
    should(!shown.includes("Not a node"), "a heading without an ID is not a node");
    shouldEqual([e8.bufferName(), lineAtPoint()], ["beta.org", 2]);
  }),
);

ertDeftest("org-roam-node-find-of-a-new-title-captures-a-note", () =>
  withNotes((dir) => {
    e8.executeKbdMacro(`${mx("org-roam-node-find")} ${spell("Gamma ray")} M-RET`);
    should(e8.variable("org-roam-capture-mode") === true, "the capture buffer is in org-roam-capture-mode");
    const note = e8.bufferText();
    should(note.startsWith(":PROPERTIES:\n:ID:       ") && note.endsWith(":END:\n#+title: Gamma ray\n"), `the new note: ${JSON.stringify(note)}`);
    e8.executeKbdMacro("H i C-c C-c");
    const file = e8.directoryFiles(dir).find((f) => f.endsWith("-gamma_ray.org"));
    should(file !== undefined, "the note's file");
    const saved = e8.readTextFile(`${dir}/${file}`);
    should(saved.endsWith("#+title: Gamma ray\nHi\n"), `the note saved: ${JSON.stringify(saved)}`);
    // The new node can be found at once.
    const shown = shownAt("Node: ", `${mx("org-roam-node-find")} C-e ${spell("Gamma ray")} RET`);
    should(shown.includes("Gamma ray"), `the new node is listed: ${JSON.stringify(shown)}`);
  }),
);

ertDeftest("org-roam-node-insert-links-to-a-node", () =>
  withNotes((dir) => {
    e8.call("find-file", `${dir}/alpha.org`);
    e8.gotoChar(e8.pointMax());
    e8.executeKbdMacro(`${mx("org-roam-node-insert")} B e t a RET`);
    const text = e8.bufferText();
    should(text.endsWith("here.\n[[id:beta-id][Beta]]"), JSON.stringify(text));
  }),
);

ertDeftest("org-roam-buffer-shows-the-backlinks-and-id-links-are-followed", () =>
  withNotes((dir) => {
    e8.call("find-file", `${dir}/beta.org`);
    e8.gotoChar(e8.lineStart(7));
    e8.call("org-roam-buffer-toggle" as e8.DefinedCommand);
    shouldEqual(e8.withCurrentBuffer("*org-roam*", () => e8.bufferText()), "Backlinks:\nAlpha (Top)\nAlpha mentions [[id:beta-id][Beta]] here.\n\n\n");
    // Following the link in Alpha comes back to Beta's heading.
    e8.call("find-file", `${dir}/alpha.org`);
    e8.gotoChar(e8.bufferText().indexOf("[[id:") + 3);
    e8.call("org-open-at-point");
    shouldEqual([e8.bufferName(), lineAtPoint()], ["beta.org", 2]);
  }),
);

ertDeftest("org-roam-org-id-get-create-gives-a-heading-or-a-file-an-id", () => {
  e8.call("switch-to-buffer", "ids.org");
  try {
    e8.insert("#+title: Ids\n* Heading\ntext\n");
    e8.call("org-mode");
    e8.gotoChar(e8.lineStart(2));
    e8.call("org-id-get-create");
    let text = e8.bufferText();
    // A drawer under the heading with an ID of a UUID's shape, aligned as Org aligns it.
    const m = /\* Heading\n:PROPERTIES:\n:ID: {7}([0-9a-fA-F-]{36})\n:END:\ntext/.exec(text);
    should(m !== null && m[1].split("-").length === 5, `the heading's ID: ${JSON.stringify(text)}`);
    e8.gotoChar(0);
    e8.call("org-id-get-create");
    text = e8.bufferText();
    should(text.startsWith(":PROPERTIES:\n:ID:       ") && text.includes(":END:\n#+title: Ids\n"), `the file's ID: ${JSON.stringify(text)}`);
  } finally {
    e8.setBufferModified(false);
    e8.call("kill-buffer", "ids.org");
  }
});

ertDeftest("org-roam-org-capture-still-finishes-and-aborts-its-own-captures", () =>
  withNotes((dir) => {
    const inbox = `${dir}/inbox.org`;
    e8.writeTextFile(inbox, "* Inbox\n");
    e8.letBind({ "org-capture-templates": [["t", "Todo", "entry", ["file", inbox], "* TODO %?"]] }, () => {
      e8.executeKbdMacro(`${mx("org-capture")} t K e p t C-c C-c`);
      shouldEqual(e8.readTextFile(inbox), "* Inbox\n* TODO Kept\n");
      e8.executeKbdMacro(`${mx("org-capture")} t ${spell("Dropped")} C-c C-k`);
      shouldEqual(
        e8.withCurrentBuffer("inbox.org", () => e8.bufferText()),
        "* Inbox\n* TODO Kept\n",
      );
    });
  }),
);
