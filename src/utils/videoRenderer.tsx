'use client'

import "regenerator-runtime/runtime"; // Add this import
import React, { Suspense, useState, useEffect, useCallback } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

import {FaCirclePlay} from "react-icons/fa6";
import Image, {StaticImageData} from "next/image";
import "@/assets/css/VideoRenderer.module.css";


// Define custom options interface to extend the base options
interface CustomSpeechRecognitionOptions {
  commands?: Array<{
    command: string | string[] | RegExp;
    callback: (...args: any[]) => void;
    matchInterim?: boolean;
    isFuzzyMatch?: boolean;
    fuzzyMatchingThreshold?: number;
    bestMatchOnly?: boolean;
  }>;
}

interface VideoRendererProps {
  src: string;
  sourceType: "local" | "youtube" | "facebook" | "instagram" | "twitter";
  thumbnail?: string | StaticImageData;
  subtitles?: string;
  autoPlay?: boolean;
  controls?: boolean;
  autoGenerateSubtitles?: boolean;
}

const VideoRenderer: React.FC<VideoRendererProps> = ({
  src,
  sourceType,
  thumbnail,
  subtitles,
  autoPlay = false,
  controls = true,
  autoGenerateSubtitles = false,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcribedSubtitles, setTranscribedSubtitles] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [showThumbnail, setShowThumbnail] = useState(true);

  const handlePlayClick = () => {
    setIsPlaying(true);
    setShowThumbnail(false);
  };

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();  

  useEffect(() => {
    setIsLoading(true);
  }, [src]);

   useEffect(() => {
    if (transcript) {
      setTranscribedSubtitles(prev => [...prev, transcript]);
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Simplified speech recognition handling
  const startListening = useCallback(() => {
    if (!browserSupportsSpeechRecognition) {
      console.error("Browser doesn't support speech recognition.");
      return;
    }

    if (!isMicrophoneAvailable) {
      console.error("Microphone access is required for speech recognition.");
      return;
    }

    try {
      SpeechRecognition.startListening({ continuous: true });
      setIsListening(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
    }
  }, [browserSupportsSpeechRecognition, isMicrophoneAvailable]);


  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (autoGenerateSubtitles && !subtitles) {
      startListening();
      return () => {
        stopListening();
      };
    }
  }, [autoGenerateSubtitles, subtitles, startListening, stopListening]);

   const getYoutubeVideoId = (url: string) => {
     const regExp =
       /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
     const match = url.match(regExp);
     return match && match[2].length === 11 ? match[2] : null;
   };

  const renderThumbnail = () => {
    if (!thumbnail) return null;
    return (
      <div className="absolute inset-0 w-full h-full">
        {typeof thumbnail === "string" ? (
          <img
            src={thumbnail}
            alt="Video thumbnail"
            className="w-full h-full object-cover rounded-lg"
          />
        ) : (
          <Image
            src={thumbnail}
            alt="Video thumbnail"
            className="w-full h-full object-cover rounded-lg"
            priority
          />
        )}
      </div>
    );
  };

  const renderSubtitles = () => {
    if (subtitles) {
      return (
        <track
          src={subtitles}
          kind="subtitles"
          srcLang="en"
          label="English"
          default
        />
      );
    }

    if (autoGenerateSubtitles && transcribedSubtitles.length > 0) {
      const vttContent = `WEBVTT\n\n${transcribedSubtitles
        .map(
          (text, index) => `
${index + 1}
00:${String(Math.floor(index * 5)).padStart(2, "0")}:00.000 --> 00:${String(
            Math.floor((index + 1) * 5)
          ).padStart(2, "0")}:00.000
${text}`
        )
        .join("\n")}`;

      const vttBlob = new Blob([vttContent], {type: "text/vtt"});
      const vttUrl = URL.createObjectURL(vttBlob);

      return (
        <track
          src={vttUrl}
          kind="subtitles"
          srcLang="en"
          label="Generated"
          default
        />
      );
    }

    return null;
  };

  const renderVideo = () => {
    switch (sourceType) {
      case "youtube": {
        const videoId = getYoutubeVideoId(src);
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="video-iframe flex min-h-[500px] w-full h-full rounded-lg"
            onLoad={() => setIsLoading(false)}
          />
        );
      }
      case "facebook":
        return (
          <iframe
            src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
              src
            )}`}
            frameBorder="0"
            allowFullScreen
            className="video-iframe flex min-h-[500px] w-full h-full rounded-lg"
            onLoad={() => setIsLoading(false)}
          />
        );
      case "instagram":
        return (
          <iframe
            src={`https://www.instagram.com/p/${src}/embed`}
            frameBorder="0"
            allowFullScreen
            className="video-iframe flex min-h-[500px] w-full h-full rounded-lg"
            onLoad={() => setIsLoading(false)}
          />
        );
      case "twitter":
        return (
          <iframe
            src={`https://twitframe.com/show?url=${encodeURIComponent(src)}`}
            frameBorder="0"
            allowFullScreen
            className="video-iframe flex min-h-[500px] w-full h-full rounded-lg"
            onLoad={() => setIsLoading(false)}
          />
        );
      default:
        return (
          <video
            src={src}
            autoPlay={autoPlay}
            controls={controls}
            onLoadedData={() => setIsLoading(false)}
            className="video-element flex min-h-[500px]  w-full h-full rounded-lg"
          >
            {renderSubtitles()}
          </video>
        );
    }
  };



  return (
    <div className="relative w-full h-full max-w-[800px] min-h-[500px] mx-auto bg-black rounded-lg overflow-hidden hover:shadow-xl group">
      {showThumbnail && (
        <div
          className="absolute inset-0 z-10 cursor-pointer "
          onClick={handlePlayClick}
        >
          {renderThumbnail()}
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center ">
            <div className="bg-white/90 group-hover:bg-black rounded-full p-4 shadow-lg hover:scale-110 transition-transform ">
              <FaCirclePlay className="w-12 h-12 text-black group-hover:text-white" />
            </div>
          </div>
        </div>
      )}

      <div className={`flex w-full h-full ${!isPlaying ? "invisible" : ""}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="loading-spinner"></div>
          </div>
        )}
        <Suspense
          fallback={<div className="loading-fallback">Loading video...</div>}
        >
          {renderVideo()}
        </Suspense>
      </div>

      {autoGenerateSubtitles && !subtitles && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-center">
          <button
            onClick={isListening ? stopListening : startListening}
            className="bg-white/90 text-black px-4 py-2 rounded-full hover:bg-white transition-colors"
          >
            {isListening ? "Stop Transcription" : "Start Transcription"}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoRenderer;