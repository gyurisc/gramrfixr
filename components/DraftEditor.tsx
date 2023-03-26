import { useState, useRef, useEffect } from 'react';
import { Editor, EditorState, RichUtils, DraftStyleMap, SelectionState } from 'draft-js';
import 'draft-js/dist/Draft.css';

type Props = {
    styleMap?: DraftStyleMap;
};

const DraftEditor: React.FC<Props> = ({ styleMap }) => {
    const editorRef = useRef<Editor | null>(null);
    const [editorState, setEditorState] = useState(() => EditorState.createEmpty());

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
