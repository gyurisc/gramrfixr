import React, { useState, useEffect, useRef } from 'react';


interface HighlightedWordProps {
    key: number;
    children: string;
}

const HighlightedWord: React.FC<HighlightedWordProps> = ({ children }) => (
    <span className="relative">
        {children}
        <span className="absolute left-0 bottom-[2px] w-full h-[2px] bg-red-500"></span>
    </span>
);

function ContentEditor() {
    const [content, setContent] = useState('');
    // const editableDivRef = useRef<HTMLDivElement>(null);

    const highlightWords = ['error', 'mistake'];

    const highlightedContent = content
        .split(/\s+/)
        .map((word, index) => {
            console.log('highlightedWords: ', word, ' index: ', index);
            if (highlightWords.includes(word.toLowerCase())) {
                console.log('highlightedWords', ' includes ', word);
                return (
                    `<span class="relative" key="${index}">
              ${word}
              <span class="absolute left-0 bottom-[2px] w-full h-[2px] bg-red-500"></span>
            </span>`
                );
            }
            return word + ' ';
        });


    const contentMarkup = {
        __html: highlightedContent.join(''),
    };

    const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
        setContent(event.target.innerHTML);
    };


    console.log('content Markup: ', contentMarkup);
    return (
        <div
            className="border border-gray-300 p-4 min-h-[200px] w-full outline-none focus:ring focus:border-blue-300"
            contentEditable="true"
            onBlur={handleBlur}
            suppressContentEditableWarning
            dangerouslySetInnerHTML={contentMarkup}
        />
    );
}

export default ContentEditor