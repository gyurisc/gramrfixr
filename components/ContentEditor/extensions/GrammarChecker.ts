import { Extension } from "@tiptap/core";
import { Dexie } from "dexie";
import { debounce } from "lodash";
import { Node as PMNode } from "prosemirror-model";
import { Plugin, PluginKey, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

import {
  GrammarCheckerOptions,
  GrammarCheckerStorage,
  Match,
  TextNodesWithPosition,
  Range,
} from "./GrammarChecker.types";
import { Correction } from "@/pages/api/grammar";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    grammarChecker: {
      /**
       * Proofreads whole document
       */
      proofread: (corrections: Correction[]) => ReturnType;

      ignoreGrammarCheckerSuggestion: () => ReturnType;

      resetGrammarCheckerMatch: () => ReturnType;
    };
  }
}

let editorView: EditorView;
let decorationSet: DecorationSet;
let extensionDocId: string | number;
let textNodesWithPosition: TextNodesWithPosition[] = [];
let match: Match | undefined | null = undefined;
let matchRange: Range | undefined | null;
let isGrammarCheckerActive = true;

const db = new Dexie("GrammarCheckerIgnoredSuggestions");

db.version(1).stores({
  ignoredWords: `
    ++id,
    &value,
    documentId
  `,
});

export enum GrammarCheckerOperations {
  MainTransactionName = "grammarCheckerTransaction",
  MatchUpdatedTransactionName = "matchUpdated",
  MatchRangeUpdatedTransactionName = "matchRangeUpdated",
  LoadingTransactionName = "grammarCheckerLoading",
}

const dispatch = (tr: Transaction) => editorView.dispatch(tr);

const selectElementText = (el: EventTarget) => {
  const range = document.createRange();
  range.selectNode(el as HTMLSpanElement);

  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
};

const updateMatchAndRange = (m?: Match, range?: Range) => {
  if (m) match = m;
  else match = undefined;

  if (range) matchRange = range;
  else matchRange = undefined;

  const tr = editorView.state.tr;
  tr.setMeta(GrammarCheckerOperations.MatchUpdatedTransactionName, true);
  tr.setMeta(GrammarCheckerOperations.MatchRangeUpdatedTransactionName, true);

  editorView.dispatch(tr);
};

const mouseEventsListener = (e: Event) => {
  if (!e.target) return;

  selectElementText(e.target);

  const matchString = (e.target as HTMLSpanElement)
    .getAttribute("match")
    ?.trim();

  if (!matchString) {
    console.error("No match string provided", { matchString });
    return;
  }

  const { match, from, to } = JSON.parse(matchString);

  if (matchString) updateMatchAndRange(match, { from, to });
  else updateMatchAndRange();
};

const mouseLeaveEventListener = () => updateMatchAndRange();

const debouncedMouseEventsListener = debounce(mouseEventsListener, 50);

const addEventListenersToDecorations = () => {
  const decorations = document.querySelectorAll("span.lt");

  if (!decorations.length) return;

  decorations.forEach((el) => {
    el.addEventListener("click", debouncedMouseEventsListener);
    el.addEventListener("mouseleave", mouseLeaveEventListener);
  });
};

export function changedDescendants(
  old: PMNode,
  cur: PMNode,
  offset: number,
  f: (node: PMNode, pos: number, cur: PMNode) => void
): void {
  const oldSize = old.childCount,
    curSize = cur.childCount;

  outer: for (let i = 0, j = 0; i < curSize; i++) {
    const child = cur.child(i);

    for (let scan = j, e = Math.min(oldSize, i + 3); scan < e; scan++) {
      if (old.child(scan) === child) {
        j = scan + 1;
        offset += child.nodeSize;
        continue outer;
      }
    }

    f(child, offset, cur);

    if (j < oldSize && old.child(j).sameMarkup(child))
      changedDescendants(old.child(j), child, offset + 1, f);
    // @ts-ignore
    else child.nodesBetween(0, child.content.size, f, offset + 1);

    offset += child.nodeSize;
  }
}

const gimmeDecoration = (from: number, to: number, match: Match) =>
  Decoration.inline(from, to, {
    // class: `lt lt-${match.rule.issueType}`,
    class: "lt lt-misspelling",
    nodeName: "span",
    match: JSON.stringify({ match, from, to }),
  });

const proofreadAndDecorateWholeDoc = async (
  doc: PMNode,
  _nodePos = 0,
  corrections: Correction[]
) => {
  textNodesWithPosition = [];

  let index = 0;
  doc?.descendants((node, pos) => {
    if (node.isText) {
      if (textNodesWithPosition[index]) {
        const text = textNodesWithPosition[index].text + node.text;
        const from = textNodesWithPosition[index].from;
        const to = from + text.length;

        textNodesWithPosition[index] = { text, from, to };
      } else {
        const text = node.text as string;
        const from = pos;
        const to = pos + text.length;

        textNodesWithPosition[index] = { text, from, to };
      }
    } else {
      index += 1;
    }
  });

  textNodesWithPosition = textNodesWithPosition.filter(Boolean);

  // getMatchAndSetDecorations
  const decorations: Decoration[] = [];

  for (const match of corrections) {
    const docFrom = match.offset;
    const docTo = docFrom + match.length;

    const finalMatch: Match = {
      replacements: [{ value: match.corrected }],
      offset: match.offset,
      length: match.length,
      message: "Possible mistake found.",
    };

    if (extensionDocId) {
      const result = await (db as any).ignoredWords.get({
        value: match.original,
      });

      if (!result)
        decorations.push(gimmeDecoration(docFrom, docTo, finalMatch));
    } else {
      decorations.push(gimmeDecoration(docFrom, docTo, finalMatch));
    }
  }

  const decorationsToRemove = decorationSet.find(0, doc.textContent.length);

  decorationSet = decorationSet.remove(decorationsToRemove);

  decorationSet = decorationSet.add(doc, decorations);

  if (editorView)
    dispatch(
      editorView.state.tr.setMeta(
        GrammarCheckerOperations.MainTransactionName,
        true
      )
    );

  setTimeout(addEventListenersToDecorations, 100);
};

export const GrammarChecker = Extension.create<
  GrammarCheckerOptions,
  GrammarCheckerStorage
>({
  name: "grammarChecker",

  addOptions() {
    return {
      documentId: undefined,
    };
  },

  addStorage() {
    return {
      match: match,
      loading: false,
      matchRange: {
        from: -1,
        to: -1,
      },
      active: isGrammarCheckerActive,
    };
  },

  addCommands() {
    return {
      proofread:
        (corrections) =>
        ({ tr }) => {
          proofreadAndDecorateWholeDoc(tr.doc, 0, corrections);
          return true;
        },

      ignoreGrammarCheckerSuggestion:
        () =>
        ({ editor }) => {
          if (this.options.documentId === undefined)
            throw new Error(
              "Please provide a unique Document ID(number|string)"
            );

          const { selection, doc } = editor.state;
          const { from, to } = selection;
          decorationSet = decorationSet.remove(decorationSet.find(from, to));

          const content = doc.textBetween(from, to);

          editor?.commands.insertContentAt({ from, to }, content);

          (db as any).ignoredWords.add({
            value: content,
            documentId: `${extensionDocId}`,
          });

          return false;
        },
      resetGrammarCheckerMatch:
        () =>
        ({
          editor: {
            view: {
              dispatch,
              state: { tr },
            },
          },
        }) => {
          match = null;
          matchRange = null;

          dispatch(
            tr
              .setMeta(
                GrammarCheckerOperations.MatchRangeUpdatedTransactionName,
                true
              )
              .setMeta(
                GrammarCheckerOperations.MatchUpdatedTransactionName,
                true
              )
          );

          return false;
        },
    };
  },

  addProseMirrorPlugins() {
    const { documentId } = this.options;

    return [
      new Plugin({
        key: new PluginKey("grammarCheckerPlugin"),
        props: {
          decorations(state) {
            return this.getState(state);
          },
          attributes: {
            spellcheck: "false",
            isGrammarCheckerActive: `${isGrammarCheckerActive}`,
          },
        },
        state: {
          init: (_, state) => {
            decorationSet = DecorationSet.create(state.doc, []);

            if (documentId) extensionDocId = documentId;

            return decorationSet;
          },
          apply: (tr) => {
            if (!isGrammarCheckerActive) return DecorationSet.empty;

            const matchUpdated = tr.getMeta(
              GrammarCheckerOperations.MatchUpdatedTransactionName
            );
            const matchRangeUpdated = tr.getMeta(
              GrammarCheckerOperations.MatchRangeUpdatedTransactionName
            );

            const loading = tr.getMeta(
              GrammarCheckerOperations.LoadingTransactionName
            );

            if (loading) this.storage.loading = true;
            else this.storage.loading = false;

            if (matchUpdated) this.storage.match = match;

            if (matchRangeUpdated) this.storage.matchRange = matchRange;

            const grammarCheckerDecorations = tr.getMeta(
              GrammarCheckerOperations.MainTransactionName
            );

            if (grammarCheckerDecorations) return decorationSet;

            decorationSet = decorationSet.map(tr.mapping, tr.doc);

            setTimeout(addEventListenersToDecorations, 100);

            return decorationSet;
          },
        },
        view: () => ({
          update: (view) => {
            editorView = view;
            setTimeout(addEventListenersToDecorations, 100);
          },
        }),
      }),
    ];
  },
});
