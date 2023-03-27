import { useState, useRef, useEffect, MouseEvent } from 'react';
import {
    Editor,
    EditorState,
    RichUtils,
    DraftStyleMap,
    SelectionState,
    CompositeDecorator,
    ContentBlock,
    DraftInlineStyle,
    ContentState
} from 'draft-js';
import 'draft-js/dist/Draft.css';

type Props = {
    styleMap?: DraftStyleMap;
    words?: string[];
};

type ContextMenuOption = {
    label: string;
    onSelect: () => void;
};

type ContextMenuProps = {
    options: ContextMenuOption[];
    x: number;
    y: number;
    onClose: () => void;
};

const ContextMenu: React.FC<ContextMenuProps> = ({ options, x, y, onClose }) => {
    const handleOptionClick = (onSelect: () => void) => {
        onSelect();
        onClose();
    };

    return (
        <div
            className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg px-4 py-2"
            style={{ top: y, left: x }}
        >
            {options.map((option, index) => (
                <div key={index} className="cursor-pointer" onClick={() => handleOptionClick(option.onSelect)}>
                    {option.label}
                </div>
            ))}
        </div>
    );
};

const WordDecorator = (props: any) => {
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

    const handleWordClick = (event: MouseEvent<HTMLSpanElement>) => {
        event.preventDefault();
        setShowContextMenu(true);
        setContextMenuPosition({ x: event.clientX, y: event.clientY });
    };

    const handleContextMenuClose = () => {
        setShowContextMenu(false);
    };

    // Changes start here
    const inlineStyle: DraftInlineStyle = props.contentState
        .getBlockForKey(props.blockKey)
        .getInlineStyleAt(props.start);

    const underlineRedClass = 'text-red-500 underline';

    return (
        <span
            className={inlineStyle.has('UNDERLINE_RED') ? underlineRedClass : ''}
            onClick={handleWordClick}
            onContextMenu={(event) => {
                event.preventDefault();
                handleWordClick(event);
            }}
        >
            {props.children}
            {showContextMenu && (
                <ContextMenu
                    options={[
                        { label: 'Item 1', onSelect: () => console.log('Item 1 selected') },
                        { label: 'Item 2', onSelect: () => console.log('Item 2 selected') },
                    ]}
                    x={contextMenuPosition.x}
                    y={contextMenuPosition.y}
                    onClose={handleContextMenuClose}
                />
            )}
        </span>
    );
};


const DraftEditor: React.FC<Props> = ({ styleMap, words }) => {
    const editorRef = useRef<Editor | null>(null);

    const decorator = new CompositeDecorator([
        {
            strategy: (contentBlock: ContentBlock, callback: (start: number, end: number) => void) => {
                if (words) {
                    words.forEach((word) => {
                        console.log("adding decorator for word: ", word);
                        const text = contentBlock.getText();
                        let start = 0;
                        let index = text.indexOf(word, start);
                        while (index >= 0) {
                            callback(index, index + word.length);
                            start = index + word.length;
                            index = text.indexOf(word, start);
                        }
                    });
                }
            },
            component: WordDecorator,
        },
    ]);

    const initialText = `The Draft framework includes a handful of CSS resources intended for use with the editor, available in a single file via the build, Draft.css.

    This CSS should be included when rendering the editor, as these styles set defaults for text alignment, spacing, and other important features. Without it, you may encounter issues with block positioning, alignment, and cursor behavior.

    If you choose to write your own CSS independent of Draft.css, you will most likely need to replicate much of the default styling.
    `;

    const [editorState, setEditorState] = useState(() =>
        EditorState.createWithContent(ContentState.createFromText(initialText), decorator as any)
    );

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
    }, []);


    const handleKeyCommand = (command: string, newState: EditorState): 'handled' | 'not-handled' => {
        const newEditorState = RichUtils.handleKeyCommand(newState, command);
        if (newEditorState) {
            setEditorState(newEditorState);
            return 'handled';
        }
        return 'not-handled';
    };

    const handleToggleInlineStyle = (inlineStyle: string): void => {
        console.log('handleToggleInlineStyle: ', inlineStyle)
        const newEditorState = RichUtils.toggleInlineStyle(editorState, inlineStyle);
        setEditorState(newEditorState);

        // Hack to force editor to update selection state
        setTimeout(() => {
            const selectionState = newEditorState.getSelection();
            const contentState = newEditorState.getCurrentContent();
            const updatedSelection = selectionState.merge({
                anchorOffset: selectionState.getFocusOffset(),
                anchorKey: selectionState.getFocusKey(),
                focusOffset: selectionState.getFocusOffset(),
                focusKey: selectionState.getFocusKey(),
                isBackward: false,
            }) as SelectionState;
            const updatedEditorState = EditorState.forceSelection(newEditorState, updatedSelection);
            setEditorState(updatedEditorState);
        }, 0);
    };

    return (
        <div className="max-w-2xl mx-auto my-4">
            <div className="mb-4">
                <button
                    className="mr-2 border-2 border-gray-300 px-2 py-1"
                    onClick={() => handleToggleInlineStyle('BOLD')}
                >
                    Bold
                </button>
                <button
                    className="mr-2 border-2 border-gray-300 px-2 py-1"
                    onClick={() => handleToggleInlineStyle('ITALIC')}
                >
                    Italic
                </button>
                <button
                    className="mr-2 border-2 border-gray-300 px-2 py-1"
                    onClick={() => handleToggleInlineStyle('UNDERLINE')}
                >
                    Underline
                </button>
                <button
                    className="mr-2 border-2 border-gray-300 px-2 py-1"
                    onClick={() => handleToggleInlineStyle('STRIKETHROUGH')}
                >
                    Strikethrough
                </button>
            </div>
            <div className="border border-gray-300 p-2">
                <Editor
                    ref={editorRef}
                    editorState={editorState}
                    handleKeyCommand={handleKeyCommand}
                    onChange={setEditorState}
                    customStyleMap={styleMap}
                />
            </div>
        </div>
    );
};

export default DraftEditor;
