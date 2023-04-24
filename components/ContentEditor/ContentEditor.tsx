"use client";

import { useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Trash2 } from "lucide-react";

import LoadingDots from "../LoadingDots";
import {
  GrammarChecker,
  GrammarCheckerOperations,
} from "./extensions/GrammarChecker";
import { Match, Range } from "./extensions/GrammarChecker.types";

const defaultContent = `<p>Biology is a really unique scient to study. There are alott of different aspects to it, such as ecology, genetics, and physiology. One of the most interesitng things to learn about in biology is animals and the way they behave. For example, did you know that some birds give hugs to their babies to keep them warm? That's so cute!</p>

<p>Another important aspect of biology is understanding the structure and function of different living things. Cells are the basic building blocks of all living organisms, and they are responsible for carrying out all of the processes necessary for life. Studying the biology of cells is important for understanding everything from how the body works to how diseases develop.</p>`;

const ContentEditor = () => {
  const [isLoading, setIsLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      GrammarChecker.configure({
        documentId: "grammar-checker-v1",
      }),
    ],
    content: defaultContent,
    editorProps: {
      attributes: {
        class:
          "border border-gray-300 min-h-[200px] p-3 prose dark:prose-invert focus:outline-none max-w-full",
      },
    },
    onUpdate({ editor }) {
      setTimeout(() => updateMatch(editor as any));
    },
    onSelectionUpdate({ editor }) {
      setTimeout(() => updateMatch(editor as any));
    },
    onTransaction({ transaction: tr }) {
      if (tr.getMeta(GrammarCheckerOperations.LoadingTransactionName))
        loading.current = true;
      else loading.current = false;
    },
  });

  const checkGrammar = async () => {
    const cleanText = editor?.getText();

    if (!cleanText) {
      console.log("content is missing: ", cleanText);
      alert("Content is missing!");
      return;
    }

    // max word limit
    if (cleanText.split(" ")?.length > 800) {
      alert("You may only use 800 words at once!");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/grammar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: cleanText }),
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        alert(errorResponse?.error);
      } else {
        const data = await response.json();

        if (data.result.corrections.length >= 0) {
          editor?.commands.proofread(data.result.corrections);
          console.log("data :: ", data.result.corrections.length);
        }
      }
    } catch (err: any) {
      alert("Failed to process your request");
    } finally {
      setIsLoading(false);
    }
  };

  // Grammar checking extension
  const shouldShow = (editor: Editor) => {
    const match = editor.storage.grammarChecker.match;
    const matchRange = editor.storage.grammarChecker.matchRange;
    const { from, to } = editor.state.selection;
    return (
      !!match && !!matchRange && matchRange.from <= from && to <= matchRange.to
    );
  };
  const match = useRef<Match | null>(null);
  const matchRange = useRef<Range | null>(null);
  const loading = useRef(false);
  const updateMatch = (editor: Editor) => {
    match.current = editor.storage.grammarChecker.match;
    matchRange.current = editor.storage.grammarChecker.matchRange;
  };

  const replacements = match.current?.replacements || [];
  const matchMessage = match.current?.message || "No Message";
  const acceptSuggestion = (sug: any) => {
    if (matchRange?.current) {
      editor?.commands.insertContentAt(matchRange?.current, sug.value);
    }
  };
  const ignoreSuggestion = () =>
    editor?.commands.ignoreGrammarCheckerSuggestion();

  return (
    <div className="my-8">
      {editor ? (
        <BubbleMenu
          editor={editor}
          tippyOptions={{
            duration: 100,
            placement: "bottom-start",
            animation: "fade",
          }}
          className="bubble-menu w-[200px] rounded-md bg-white"
          shouldShow={({ editor }) => shouldShow(editor)}
        >
          {/* <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-stone-900">{matchMessage}</p>
            <button
              className="cursor-pointer rounded bg-stone-100 p-1 hover:bg-stone-200"
              onClick={ignoreSuggestion}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {replacements?.map((replacement: any, i: number) => (
              <button
                className="cursor-pointer rounded bg-indigo-100 px-2 py-1 text-sm text-indigo-900 hover:bg-indigo-200"
                onClick={() => acceptSuggestion(replacement)}
                key={i + replacement.value}
              >
                {replacement.value}
              </button>
            ))}
          </div> */}

          <div className="absolute left-0 mt-2 w-[200px] rounded-[6px] bg-white shadow-md">
            <h3 className="border-b border-stone-100 px-3 py-2 font-bold">
              {matchMessage}
            </h3>
            {replacements?.map((replacement: any, i: number) => (
              <div
                className="cursor-pointer px-3 py-2 font-bold text-emerald-500 outline-none hover:bg-emerald-500 hover:text-white"
                onClick={() => acceptSuggestion(replacement)}
                key={i + replacement.value}
              >
                {replacement.value}
              </div>
            ))}
            <div
              onClick={ignoreSuggestion}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:rounded-b-md hover:bg-stone-100"
            >
              <Trash2 className="h-4 w-4" />
              <span>Dismiss</span>
            </div>
          </div>
        </BubbleMenu>
      ) : null}
      <EditorContent editor={editor} />
      <button
        type="button"
        className="mt-8 rounded-md bg-black px-6 py-3 text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-400"
        onClick={checkGrammar}
        disabled={isLoading}
      >
        {isLoading ? (
          <LoadingDots color="white" style="large" />
        ) : (
          "Check My Grammar"
        )}
      </button>
    </div>
  );
};

export default ContentEditor;
