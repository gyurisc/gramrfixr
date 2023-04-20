"use client";

import { useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import { useEditor, EditorContent, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import LoadingDots from "../LoadingDots";
import {
  LanguageTool,
  LanguageToolHelpingWords,
} from "./extensions/GrammarChecker";
import { Match, Range } from "./extensions/GrammarChecker.types";

const defaultContent = `<p>Biology is a really unique scient to study. There are alott of different aspects to it, such as ecology, genetics, and physiology. One of the most interesitng things to learn about in biology is animals and the way they behave. For example, did you know that some birds give hugs to their babies to keep them warm? That's so cute!</p>

<p>Another important aspect of biology is understanding the structure and function of different living things. Cells are the basic building blocks of all living organisms, and they are responsible for carrying out all of the processes necessary for life. Studying the biology of cells is important for understanding everything from how the body works to how diseases develop.</p>`;

const ContentEditor = () => {
  const [isLoading, setIsLoading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      LanguageTool.configure({
        automaticMode: true,
        documentId: "gramrfixr-v1",
        apiUrl: "https://api.languagetool.org/v2/check", // replace this with your actual url
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
      if (tr.getMeta(LanguageToolHelpingWords.LoadingTransactionName))
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
    const match = editor.storage.languagetool.match;
    const matchRange = editor.storage.languagetool.matchRange;
    const { from, to } = editor.state.selection;
    return (
      !!match && !!matchRange && matchRange.from <= from && to <= matchRange.to
    );
  };
  const match = useRef<Match | null>(null);
  const matchRange = useRef<Range | null>(null);
  const loading = useRef(false);
  const updateMatch = (editor: Editor) => {
    match.current = editor.storage.languagetool.match;
    matchRange.current = editor.storage.languagetool.matchRange;
  };

  const replacements = match.current?.replacements || [];
  const matchMessage = match.current?.message || "No Message";
  const acceptSuggestion = (sug: any) => {
    if (matchRange?.current) {
      editor?.commands.insertContentAt(matchRange?.current, sug.value);
    }
  };
  const ignoreSuggestion = () =>
    editor?.commands.ignoreLanguageToolSuggestion();

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
          className="bubble-menu w-[300px] rounded-md bg-white p-4"
          shouldShow={({ editor }) => shouldShow(editor)}
        >
          <div className="mb-2 flex items-center justify-between">
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
