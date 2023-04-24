import React, { useState } from 'react'
import {
    Trash2,
    Calendar
} from "lucide-react"

interface Correction {
    original: string;
    corrected: string;
}

const HighlightedWord = ({ original, corrected }: Correction) => {
    const [menuProps, setMenuProps] = useState({ x: 0, y: 0, corrected: '', visible: false });
    const [menuVisible, setMenuVisible] = useState(false);

    return (
        <div className='relative'>
            <span className="border-b-2 border-red-700 text-decoration-none cursor-pointer"
                onClick={(e) => {
                    e.preventDefault();
                    setMenuVisible(!menuVisible);
                }}
            >
                {original}
            </span>
            {menuVisible && (
                <div className='absolute left-0 mt-2'>
                    <div className="bg-white border rounded shadow-md">
                        <div className="p-2 hover:bg-gray-100 cursor-pointer">
                            <h3 className='px-2 mt-1 text-sm text-gray-700'>
                                Correct your spelling
                            </h3>
                            <p className='px-2 py-3 text-green-600 text-bold text-xl'>
                                {corrected}
                            </p>
                        </div>
                        <div className="p-2 hover:bg-gray-100 cursor-pointer">
                            <span>
                                <Trash2 className='mr-2 h-4 w-4' />
                                <span className='text-base'>
                                    Dismiss correction
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HighlightedWord