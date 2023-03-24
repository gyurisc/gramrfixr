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

    const highlightedContent = content.split(' ').map((word, index) => {
        if (highlightWords.includes(word.toLowerCase())) {
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
        __html: highlightedContent.join('').replace(/(?:\r\n|\r|\n)/g, '<br>'),
    };

    // GPT says: 
    // In the handleBlur function, I've updated the code to replace <div> tags (used by browsers for newlines in contentEditable elements) 
    // with <br> tags and remove the closing </div> tags. This way, the newlines are preserved correctly when the component loses focus.
    const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
        const text = event.target.innerHTML
            .replace(/<div>/g, '<br>')
            .replace(/<\/div>/g, '');

        console.log('text with newlines fixed ', text);
        setContent(text);
    };


    console.log('content Markup', contentMarkup);
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