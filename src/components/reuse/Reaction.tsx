// components/UI/Reaction.tsx
"use client";

import {ReactionType} from "@/assets/data/blogData";
import {useState, useEffect} from "react";

const REACTIONS = [
  {type: "like", emoji: "👍", label: "Like"},
  {type: "love", emoji: "❤️", label: "Love"},
  {type: "haha", emoji: "😂", label: "Haha"},
  {type: "wow", emoji: "😮", label: "Wow"},
  {type: "sad", emoji: "😢", label: "Sad"},
  {type: "angry", emoji: "😡", label: "Angry"},
];

interface ReactionsProps {
  onReaction: (reaction: ReactionType) => void;
  onRemove: () => void;
  currentReaction: ReactionType | null;
}

export const Reactions = ({
  onReaction,
  onRemove,
  currentReaction,
}: ReactionsProps) => {
  const [showPopup, setShowPopup] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (held) {
      timer = setTimeout(() => setShowPopup(true), 500);
    }
    return () => clearTimeout(timer);
  }, [held]);

  return (
    <div className="relative">
      <button
        className={`flex items-center justify-center w-full py-2 rounded-md text-gray-300 hover:bg-white/10 transition ${
          currentReaction ? "text-blue-400 font-medium" : ""
        }`}
        onMouseDown={() => setHeld(true)}
        onMouseLeave={() => {
          setHeld(false);
          setTimeout(() => setShowPopup(false), 300);
        }}
        onMouseUp={() => {
          setHeld(false);
          if (!showPopup && currentReaction) {
            onRemove();
          }
        }}
        onTouchStart={() => setHeld(true)}
        onTouchEnd={() => setHeld(false)}
        onClick={() => !showPopup && onReaction("like")}
      >
        {currentReaction ? (
          <span className="mr-2 text-lg">
            {REACTIONS.find((r) => r.type === currentReaction)?.emoji}
          </span>
        ) : (
          <span className="mr-2">👍</span>
        )}
        <span>
          {currentReaction
            ? REACTIONS.find((r) => r.type === currentReaction)?.label
            : "Like"}
        </span>
      </button>

      {showPopup && (
        <div
          className="absolute bottom-full left-0 mb-2 bg-gray-800 rounded-full p-2 flex space-x-1 shadow-lg z-10"
          onMouseEnter={() => setShowPopup(true)}
          onMouseLeave={() => setShowPopup(false)}
        >
          {REACTIONS.map(({type, emoji, label}) => (
            <button
              key={type}
              onClick={() => {
                onReaction(type as ReactionType);
                setShowPopup(false);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-700 transition transform hover:scale-125"
              aria-label={label}
            >
              <span className="text-xl">{emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};