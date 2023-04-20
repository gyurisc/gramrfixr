import { Extension } from "@tiptap/core";
import { Dexie } from "dexie";
import { debounce } from "lodash";
import { Node as PMNode } from "prosemirror-model";
import { Plugin, PluginKey, Transaction } from "prosemirror-state";
import { Decoration, DecorationSet, EditorView } from "prosemirror-view";

import {
  GramrFixrOptions,
  GramrFixrStorage,
  GramrFixrResponse,
  Match,
  TextNodesWithPosition,
  Range,
} from "./GrammarChecker.types";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    languagetool: {
      /**
       * Proofreads whole document
       */
      proofread: () => ReturnType;

      toggleProofreading: () => ReturnType;

      ignoreLanguageToolSuggestion: () => ReturnType;

      resetLanguageToolMatch: () => ReturnType;

      toggleLanguageTool: () => ReturnType;

      getLanguageToolState: () => ReturnType;
    };
  }
}

let editorView: EditorView;
let decorationSet: DecorationSet;
let extensionDocId: string | number;
let apiUrl = "";
let textNodesWithPosition: TextNodesWithPosition[] = [];
let match: Match | undefined | null = undefined;
let matchRange: Range | undefined | null;
let proofReadInitially = false;
let isLanguageToolActive = true;
let lastOriginalFrom = 0;

const db = new Dexie("GramrFixrIgnoredSuggestions");

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
  LoadingTransactionName = "languageToolLoading",
}

const dispatch = (tr: Transaction) => editorView.dispatch(tr);

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

const debouncedMouseEventsListener = debounce(mouseEventsListener, 50);

const addEventListenersToDecorations = () => {
  const decorations = document.querySelectorAll("span.lt");

  if (!decorations.length) return;

  decorations.forEach((el) => {
    el.addEventListener("mouseover", debouncedMouseEventsListener);
    el.addEventListener("mouseenter", debouncedMouseEventsListener);
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

const moreThan500Words = (s: string) => s.trim().split(/\s+/).length >= 500;

const getMatchAndSetDecorations = async (
  doc: PMNode,
  text: string,
  originalFrom: number
) => {
  const postOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: `text=${encodeURIComponent(text)}&language=en-US&enabledOnly=false`,
  };

  const ltRes: GramrFixrResponse = await (
    await fetch(apiUrl, postOptions)
  ).json();

  const { matches } = ltRes;

  const decorations: Decoration[] = [];

  for (const match of matches) {
    const docFrom = match.offset + originalFrom;
    const docTo = docFrom + match.length;

    if (extensionDocId) {
      const content = text.substring(
        match.offset - 1,
        match.offset + match.length - 1
      );
      const result = await (db as any).ignoredWords.get({ value: content });

      if (!result) decorations.push(gimmeDecoration(docFrom, docTo, match));
    } else {
      decorations.push(gimmeDecoration(docFrom, docTo, match));
    }
  }

  const decorationsToRemove = decorationSet.find(
    originalFrom,
    originalFrom + text.length
  );

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

const debouncedGetMatchAndSetDecorations = debounce(
  getMatchAndSetDecorations,
  300
);

const onNodeChanged = (doc: PMNode, text: string, originalFrom: number) => {
  if (originalFrom !== lastOriginalFrom)
    getMatchAndSetDecorations(doc, text, originalFrom);
  else debouncedGetMatchAndSetDecorations(doc, text, originalFrom);

  lastOriginalFrom = originalFrom;
};

const proofreadAndDecorateWholeDoc = async (doc: PMNode, nodePos = 0) => {
  textNodesWithPosition = [];

  let index = 0;
  doc?.descendants((node, pos) => {
    if (!node.isText) {
      index += 1;
      return;
    }

    const intermediateTextNodeWIthPos = {
      text: "",
      from: -1,
      to: -1,
    };

    if (textNodesWithPosition[index]) {
      intermediateTextNodeWIthPos.text =
        textNodesWithPosition[index].text + node.text;
      intermediateTextNodeWIthPos.from =
        textNodesWithPosition[index].from + nodePos;
      intermediateTextNodeWIthPos.to =
        intermediateTextNodeWIthPos.from +
        intermediateTextNodeWIthPos.text.length +
        nodePos;
    } else {
      intermediateTextNodeWIthPos.text = node?.text || "";
      intermediateTextNodeWIthPos.from = pos + nodePos;
      intermediateTextNodeWIthPos.to =
        pos + nodePos + (node?.text || "").length;
    }

    textNodesWithPosition[index] = intermediateTextNodeWIthPos;
  });

  textNodesWithPosition = textNodesWithPosition.filter(Boolean);

  let finalText = "";

  const chunksOf500Words: { from: number; text: string }[] = [];

  let upperFrom = 0 + nodePos;
  let newDataSet = true;

  let lastPos = 1 + nodePos;

  for (const { text, from, to } of textNodesWithPosition) {
    if (!newDataSet) {
      upperFrom = from;

      newDataSet = true;
    } else {
      const diff = from - lastPos;
      if (diff > 0) finalText += Array(diff + 1).join(" ");
    }

    lastPos = to;

    finalText += text;

    if (moreThan500Words(finalText)) {
      const updatedFrom = chunksOf500Words.length ? upperFrom : upperFrom + 1;

      chunksOf500Words.push({
        from: updatedFrom,
        text: finalText,
      });

      finalText = "";
      newDataSet = false;
    }
  }

  chunksOf500Words.push({
    from: chunksOf500Words.length ? upperFrom : 1,
    text: finalText,
  });

  const requests = chunksOf500Words.map(({ text, from }) =>
    getMatchAndSetDecorations(doc, text, from)
  );

  if (editorView)
    dispatch(
      editorView.state.tr.setMeta(
        GrammarCheckerOperations.LoadingTransactionName,
        true
      )
    );
  Promise.all(requests).then(() => {
    if (editorView)
      dispatch(
        editorView.state.tr.setMeta(
          GrammarCheckerOperations.LoadingTransactionName,
          false
        )
      );
  });

  proofReadInitially = true;
};

const debouncedProofreadAndDecorate = debounce(
  proofreadAndDecorateWholeDoc,
  500
);

export const GramrFixr = Extension.create<GramrFixrOptions, GramrFixrStorage>({
  name: "gramrfixr",

  addOptions() {
    return {
      apiUrl: "/api/grammar",
      automaticMode: true,
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
      active: isLanguageToolActive,
    };
  },

  addCommands() {
    return {
      proofread:
        () =>
        ({ tr }) => {
          apiUrl = this.options.apiUrl;

          proofreadAndDecorateWholeDoc(tr.doc);
          return true;
        },

      ignoreLanguageToolSuggestion:
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

          (db as any).ignoredWords.add({
            value: content,
            documentId: `${extensionDocId}`,
          });

          return false;
        },
      resetLanguageToolMatch:
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

      toggleLanguageTool:
        () =>
        ({ commands }) => {
          isLanguageToolActive = !isLanguageToolActive;

          if (isLanguageToolActive) commands.proofread();
          else commands.resetLanguageToolMatch();

          this.storage.active = isLanguageToolActive;

          return false;
        },

      getLanguageToolState: () => () => isLanguageToolActive,
    };
  },

  addProseMirrorPlugins() {
    const { apiUrl: optionsApiUrl, documentId } = this.options;

    apiUrl = optionsApiUrl;

    return [
      new Plugin({
        key: new PluginKey("gramrfixrPlugin"),
        props: {
          decorations(state) {
            return this.getState(state);
          },
          attributes: {
            spellcheck: "false",
            isLanguageToolActive: `${isLanguageToolActive}`,
          },

          handlePaste(view) {
            const { docChanged } = view.state.tr;

            if (docChanged) debouncedProofreadAndDecorate(view.state.tr.doc);

            return false;
          },
        },
        state: {
          init: (_, state) => {
            decorationSet = DecorationSet.create(state.doc, []);

            if (this.options.automaticMode)
              proofreadAndDecorateWholeDoc(state.doc);

            if (documentId) extensionDocId = documentId;

            return decorationSet;
          },
          apply: (tr) => {
            if (!isLanguageToolActive) return DecorationSet.empty;

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

            const languageToolDecorations = tr.getMeta(
              GrammarCheckerOperations.MainTransactionName
            );

            if (languageToolDecorations) return decorationSet;

            if (tr.docChanged && this.options.automaticMode) {
              if (!proofReadInitially) debouncedProofreadAndDecorate(tr.doc);
              else {
                const {
                  selection: { from, to },
                } = tr;

                let changedNodeWithPos: { node: PMNode; pos: number };

                const currentBlockNode = tr.doc.descendants((node, pos) => {
                  if (!node.isBlock) return false;

                  const [nodeFrom, nodeTo] = [pos, pos + node.nodeSize];

                  if (!(nodeFrom <= from && to <= nodeTo)) return;

                  changedNodeWithPos = { node, pos };
                });

                // @ts-ignore
                if (changedNodeWithPos) {
                  onNodeChanged(
                    changedNodeWithPos.node,
                    changedNodeWithPos.node.textContent,
                    changedNodeWithPos.pos + 1
                  );
                }
              }
            }

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
