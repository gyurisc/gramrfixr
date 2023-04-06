import React from 'react';

const ContextMenu = ({ x, y, corrected }: { x: number, y: number, corrected: string }) => {
    const menuStyle = {
        position: 'absolute',
        top: `${y}px`,
        left: `${x}px`,
        backgroundColor: 'white',
        border: '1px solid black',
        padding: '5px',
        borderRadius: '5px',
        zIndex: '1000',
    };

    return (
        <div style={menuStyle}>
            <div>
                Did you mean {corrected}?
            </div>
            <div>
                Second line
            </div>

        </div>
    );
};

export default ContextMenu;