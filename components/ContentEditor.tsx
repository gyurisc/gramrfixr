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
    const [corrections, setCorrections] = useState([]);
    const [improvements, setImprovements] = useState([]);

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

        if (!response.ok) {
            console.log('error ', response.statusText);
        } else {

            const data = await response.json();
            console.log('Received response: ', data);

            if (data.result.improvements.length >= 0) {
                setImprovements(data.result.improvements);
            }

            if (data.result.corrections.length >= 0) {
                setCorrections(data.result.corrections);
            }

        }

        setBusy(false);
    };

    const handleBlur = () => {
        if (editorRef.current != null) {
            editorRef.current.innerHTML = `
            Biology is a really unique scient to study There are alott of different aspects to it such as ecology genetics and physiology One of the most interesitng things to learn about in biology is animals and the way they behave For example did you know that some birds give hugs to their babies to keep them warm That's so cute <br>

            Another important aspect of biology is understanding the structure and function of different living things Cells are the basic building blocks of all living organisms and they are resposible for carrying out all of the processes neccessary for life Studying the biology of cells is important for understanding everything from how the body works to how diseases develop <br>
            `;

            const corr = [
                {
                    "original": "scient",
                    "correction": "science"
                },
                {
                    "original": "alott",
                    "correction": "a lot"
                },
                {
                    "original": "interesitng",
                    "correction": "interesting"
                },
                {
                    "original": "resposible",
                    "correction": "responsible"
                },
                {
                    "original": "neccessary",
                    "correction": "necessary"
                }
            ];

            let modifiedText = editorRef.current.innerHTML;
            for (let i = 0; i < corr.length; i++) {
                const { original, start, end, correction } = corr[i];

                // replace the original word with the correction
                modifiedText = modifiedText.replace(original, `<u style="border-bottom: 2px solid red; text-decoration: none;">${original}</u>`);
            }

            editorRef.current.innerHTML = modifiedText;
        }
    }

    return (
        <div>
            <div
                className="border border-gray-300 p-4 min-h-[200px] w-full outline-none focus:ring focus:border-blue-300"
                ref={editorRef}
                contentEditable="true"
                suppressContentEditableWarning
                onInput={handleChange}
                onBlur={handleBlur}
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