import React from "react";
import {FaStar, FaStarHalf, FaRegStar} from "react-icons/fa";

interface RatingStarsProps {
  rating: string | number;
  size?: number;
  color?: string;
}

const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  size = 20,
  color = "#ffd700",
}) => {
  // Convert rating to number if it's a string
  const numRating = Number(rating);

  // Generate array of 5 elements to represent stars
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(numRating)) {
      // Full star
      stars.push(
        <FaStar key={i} size={size} className="inline-block" color={color} />
      );
    } else if (i === Math.ceil(numRating) && !Number.isInteger(numRating)) {
      // Half star
      stars.push(
        <FaStarHalf
          key={i}
          size={size}
          className="inline-block"
          color={color}
        />
      );
    } else {
      // Empty star
      stars.push(
        <FaRegStar key={i} size={size} className="inline-block" color={color} />
      );
    }
  }

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Rating: ${numRating} out of 5 stars`}
    >
      {stars}
      <span className="ml-2 text-sm text-gray-600">{numRating}</span>
    </div>
  );
};

export default RatingStars;