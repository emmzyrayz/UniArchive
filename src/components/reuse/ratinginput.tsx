import { useState } from "react";
import { Button } from "@/components/UI";

interface RatingInputProps {
  value?: number;
  onChange?: (rating: number) => void;
  max?: number;
  size?: "sm" | "md" | "lg";
  readonly?: boolean;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export default function RatingInput({
  value = 0,
  onChange,
  max = 5,
  size = "md",
  readonly = false,
  showLabel = true,
  label = "Rating",
  className = "",
}: RatingInputProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(value);

  const sizeStyles = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  const textStyles = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const handleRatingClick = (rating: number) => {
    if (readonly) return;

    setCurrentRating(rating);
    onChange?.(rating);
  };

  const displayRating = hoverRating || currentRating;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {showLabel && (
        <div className="flex items-center gap-2">
          <span className={`font-medium text-gray-700 ${textStyles[size]}`}>
            {label}
          </span>
          {displayRating > 0 && (
            <span className={`text-gray-500 ${textStyles[size]}`}>
              ({displayRating}/{max})
            </span>
          )}
        </div>
      )}

      <div className="flex gap-1">
        {Array.from({ length: max }, (_, index) => {
          const rating = index + 1;
          const isFilled = rating <= displayRating;

          return (
            <button
              key={rating}
              type="button"
              onClick={() => handleRatingClick(rating)}
              onMouseEnter={() => !readonly && setHoverRating(rating)}
              onMouseLeave={() => !readonly && setHoverRating(0)}
              disabled={readonly}
              className={`
                transition-all duration-200 transform hover:scale-110
                ${readonly ? "cursor-default" : "cursor-pointer"}
                ${sizeStyles[size]}
              `}
            >
              <svg
                className={`w-full h-full ${
                  isFilled ? "text-yellow-400" : "text-gray-300"
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          );
        })}
      </div>

      {/* Rating Labels */}
      {!readonly && displayRating > 0 && (
        <div className={`text-center text-gray-600 ${textStyles[size]}`}>
          {displayRating === 1 && "Poor"}
          {displayRating === 2 && "Fair"}
          {displayRating === 3 && "Good"}
          {displayRating === 4 && "Very Good"}
          {displayRating === 5 && "Excellent"}
          {displayRating > 5 && `${displayRating} Stars`}
        </div>
      )}
    </div>
  );
}
