import React, { useState } from "react";
import { Trash2 } from "lucide-react";

interface Correction {
  original: string;
  corrected: string;
}

const HighlightedWord = ({ original, corrected }: Correction) => {
  const [menuProps, setMenuProps] = useState({
    x: 0,
    y: 0,
    corrected: "",
    visible: false,
  });
  const [menuVisible, setMenuVisible] = useState(false);

  return (
    <div className="relative">
      <span
        className="text-decoration-none cursor-pointer border-b-2 border-red-700"
        onClick={(e) => {
          e.preventDefault();
          setMenuVisible(!menuVisible);
        }}
      >
        {original}
      </span>
      {menuVisible && (
        // <div className="absolute left-0 mt-2">
        //   <div className="rounded border bg-white shadow-md">
        //     <div className="cursor-pointer p-2 hover:bg-gray-100">
        //       <h3 className="mt-1 px-2 text-sm text-gray-700">
        //         Correct your spelling
        //       </h3>
        //       <p className="text-bold px-2 py-3 text-xl text-green-600">
        //         {corrected}
        //       </p>
        //     </div>
        //     <div className="cursor-pointer p-2 hover:bg-gray-100">
        //       <span>
        //         <Trash2 className="mr-2 h-4 w-4" />
        //         <span className="text-base">Dismiss</span>
        //       </span>
        //     </div>
        //   </div>
        // </div>
        <div className="absolute left-0 mt-2 w-[200px] rounded-[6px] bg-white shadow-md">
          <h3 className="border-b border-stone-100 px-3 py-2 font-bold">
            Correct your spelling
          </h3>
          <div className="cursor-pointer px-3 py-2 font-bold text-emerald-500 outline-none hover:bg-emerald-500 hover:text-white">
            {corrected}
          </div>
          <div className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:rounded-b-md hover:bg-stone-100">
            <Trash2 className="h-4 w-4" />
            <span>Dismiss</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightedWord;
