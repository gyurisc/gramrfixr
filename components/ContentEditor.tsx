import React, { useState, useEffect, useRef } from 'react';
import LoadingDots from './LoadingDots';
import sanitizeHtml from 'sanitize-html'

interface HighlightedWordProps {
    key: number;
    children: string;
}

interface Correction {
    original: string;
    corrrection: string;
}
const HighlightedWord: React.FC<HighlightedWordProps> = ({ children }) => (
    <span className="relative">
        {children}
        <span className="absolute left-0 bottom-[2px] w-full h-[2px] bg-red-500"></span>
    </span>
);

function ContentEditor() {
    const [content, setContent] = useState('');
    const [busy, setBusy] = useState(false);

    const corrections = [];
    const improvements = [];

    const editorRef = useRef<any>();

    const handleChange = () => {
        if (editorRef.current != null) {
            setContent(editorRef.current.innerHTML);
        }
    };

    const checkGrammar = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();

        const cleanText = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });

        if (!cleanText) {
            console.log('content is missing: ', cleanText);
            return;
        }

        setBusy(true);

        const response = await fetch('/api/grammar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: cleanText }),
        });

        const data = await response.json();
        console.log('Received response: ', data);

        const improvements = data.improvements;
        const corrections = data.corrections;

        if (!response.ok) {
            console.log('error ', response.statusText);
            throw new Error(response.statusText);
        }

        setBusy(false);
    };

    return (
        <div>
            <div
                className="border border-gray-300 p-4 min-h-[200px] w-full outline-none focus:ring focus:border-blue-300"
                ref={editorRef}
                contentEditable="true"
                suppressContentEditableWarning
                onInput={handleChange}
            />
            <div className='sm:px-4 px-2'>
                {!busy && (
                    <button
                        className="bg-black text-white px-6 py-3 rounded-md mt-5 hover:bg-gray-900 transition-colors"
                        onClick={(e) => checkGrammar(e)}
                    >
                        Check My Grammar
                    </button>
                )}
                {busy && (
                    <button
                        className="bg-black text-white px-6 py-3 rounded-md mt-5 hover:bg-gray-900 transition-colors"
                        disabled
                    >
                        <LoadingDots color="white" style="large" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default ContentEditor