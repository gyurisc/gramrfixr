"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";
import LoadingDots from "./LoadingDots";

const defaultContent = `<p>Biology is a really unique scient to study. There are alott of different aspects to it, such as ecology, genetics, and physiology. One of the most interesitng things to learn about in biology is animals and the way they behave. For example, did you know that some birds give hugs to their babies to keep them warm? That's so cute!</p>

<p>Another important aspect of biology is understanding the structure and function of different living things. Cells are the basic building blocks of all living organisms, and they are responsible for carrying out all of the processes necessary for life. Studying the biology of cells is important for understanding everything from how the body works to how diseases develop.</p>`;

const ContentEditor = () => {
  const [isLoading, setIsLoading] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: defaultContent,
    editorProps: {
      attributes: {
        class:
          "border border-gray-300 min-h-[200px] p-3 prose dark:prose-invert focus:outline-none max-w-full",
      },
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

  return (
    <div className="my-8">
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
