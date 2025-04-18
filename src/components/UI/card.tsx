import React from "react";
import {motion} from "framer-motion";

interface DemoCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  opacity?: number;
}

export const DemoCard: React.FC<DemoCardProps> = ({
  title,
  description,
  imageUrl,
  opacity = 1,
}) => {
  return (
    <motion.div
      className="w-40 h-60 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center overflow-hidden"
      style={{opacity}}
      initial={{scale: 0.8}}
      animate={{scale: 1}}
      transition={{duration: 0.5}}
    >
      {imageUrl && (
        <img src={imageUrl} alt={title} className="w-full h-24 object-cover" />
      )}
      <div className="p-4 text-center">
        <p className="text-lg font-semibold">{title}</p>
        {description && (
          <p className="text-sm text-gray-600 mt-2">{description}</p>
        )}
      </div>
    </motion.div>
  );
};

