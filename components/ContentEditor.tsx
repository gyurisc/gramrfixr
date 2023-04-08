"use client"

import React, { useState, useEffect, useRef } from 'react';
import LoadingDots from './LoadingDots';
import sanitizeHtml from 'sanitize-html'
  
import {
    Cloud,
    CreditCard,
    Github,
    Keyboard,
    LifeBuoy,
    LogOut,
    Mail,
    MessageSquare,
    Plus,
    PlusCircle,
    Settings,
    User,
    UserPlus,
    Users,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
  } from "@/components/ui/context-menu"


interface HighlightedWordProps {
    key: number;
    children: string;
}

interface Correction {
    original: string;
    corrected: string;
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

    const [menuProps, setMenuProps] = useState({ x: 0, y: 0, corrected: '', visible: false });

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

            if (data.result.corrections.length >= 0) {
                highlightCorrections(data.result.corrections);
            }

        }

        setBusy(false);
    };

    function highlightCorrections(corrections: Correction[]) {
        if (editorRef.current != null) {
            editorRef.current.innerHTML = content;

            console.log('highlightCorrections: ', corrections);
            let modifiedText = editorRef.current.innerHTML;
            for (let i = 0; i < corrections.length; i++) {
                const { original, corrected } = corrections[i];

                console.log('original: ', original);
                console.log('corrected: ', corrected);

                // replace the original word with the correction
                modifiedText = modifiedText.replace(original, `
                    <u style="border-bottom: 2px solid red; text-decoration: none; cursor: pointer;"
                        onclick="showMenu(event, '${corrected}')"
                    >
                    ${original}
                </u>`);
            }

            window.showMenu = function (event: any, corrected: string) {
                const menu = document.createElement('div');
                menu.style.position = 'absolute';
                menu.style.top = `${event.clientY}px`;
                menu.style.left = `${event.clientX}px`;
                menu.style.backgroundColor = 'white';
                menu.style.border = '1px solid black';
                menu.style.padding = '5px';
                menu.style.borderRadius = '5px';
                menu.style.zIndex = '1000';
                menu.textContent = `Did you mean ${corrected}?`;

                document.body.appendChild(menu);

                const closeMenu = () => {
                    document.body.removeChild(menu);
                    document.removeEventListener('click', closeMenu);
                };

                setTimeout(function () {
                    document.addEventListener('click', closeMenu);
                }, 0);

            }

            editorRef.current.innerHTML = modifiedText;
        }
    }



    const showMenuPrototype = (event: any, word: string, corrected: string) => {

        setMenuProps({
            x: event.clientX,
            y: event.clientY,
            corrected,
            visible: true,
        });

        // const closeMenu = () => {
        //     setMenuProps((prevProps) => ({ ...prevProps, visible: false }));
        //     document.removeEventListener('click', closeMenu);
        // };

        // setTimeout(function () {
        //     document.addEventListener('click', closeMenu);
        // }, 0);

        // This was working
        // const menu = document.createElement('div');
        // menu.style.position = 'absolute';
        // menu.style.top = `${event.clientY}px`;
        // menu.style.left = `${event.clientX}px`;
        // menu.style.backgroundColor = 'white';
        // menu.style.border = '1px solid black';
        // menu.style.padding = '5px';
        // menu.style.borderRadius = '5px';
        // menu.style.zIndex = '1000';
        // menu.innerHTML = `Did <b>you</b> mean ${corrected}?`;


        // document.body.appendChild(menu);


        // const closeMenu = () => {
        //     document.body.removeChild(menu);
        //     document.removeEventListener('click', closeMenu);
        // };

        // setTimeout(function () {
        //     document.addEventListener('click', closeMenu);
        // }, 0);

    }

    // maybe to use useEffect here, so it only runs once 
    // or use dynamic import
    if (typeof window !== 'undefined') {

        window.showMenuPrototype = showMenuPrototype;
    }

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
            {/* <div>
                <span onClick={(e) => window.showMenuPrototype(e, 'word', 'corrected word')} >
                    Menu Testing
                </span>
            </div> */}
            {/* {menuProps.visible && <ContextMenu x={menuProps.x} y={menuProps.y} corrected={menuProps.corrected} />} */}
            <ContextMenu>
            <ContextMenuTrigger>Right click</ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>Correct your spelling - title</ContextMenuItem>
                <ContextMenuItem>My - correction comes here</ContextMenuItem>
                <ContextMenuItem>Dismiss correction</ContextMenuItem>
            </ContextMenuContent>
            </ContextMenu>

        </div>
    );
}

export default ContentEditor;
