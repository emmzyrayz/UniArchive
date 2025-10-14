import { useState } from "react";
import {
  Card,
  Button,
  RadioGroup,
  Checkbox,
  Alert,
} from "@/components/UI";

import {ProgressBar} from "@/components/reuse"

interface QuizQuestion {
  id: string;
  type: "single" | "multiple" | "text";
  question: string;
  options?: Array<{
    id: string;
    text: string;
    correct?: boolean;
  }>;
  explanation?: string;
  points: number;
}

interface QuizFormProps {
  questions: QuizQuestion[];
  onComplete: (results: {
    score: number;
    total: number;
    answers: Record<string, string | string[]>;
    timeSpent: number;
  }) => void;
  timeLimit?: number; // in minutes
  allowRetry?: boolean;
  className?: string;
}

export default function QuizForm({
  questions,
  onComplete,
  timeLimit,
  allowRetry = false,
  className = "",
}: QuizFormProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Timer effect
  useState(() => {
    if (timeLimit && !showResults) {
      const timer = setInterval(() => {
        setTimeSpent((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  });

  const currentQ = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;
  const timeLeft = timeLimit ? timeLimit * 60 - timeSpent : 0;

  const handleAnswerChange = (value: string | string[]) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    setCurrentQuestion((prev) => prev - 1);
  };

  const handleSubmit = () => {
    setSubmitted(true);

    // Calculate score
    const score = questions.reduce((total, question) => {
      const userAnswer = answers[question.id];

      if (!userAnswer) return total;

      if (question.type === "single") {
        const selectedOption = question.options?.find(
          (opt) => opt.id === userAnswer
        );
        return total + (selectedOption?.correct ? question.points : 0);
      } else if (question.type === "multiple") {
        const userAnswers = userAnswer as string[];
        const correctOptions =
          question.options?.filter((opt) => opt.correct).map((opt) => opt.id) ||
          [];

        // Only award points if all correct options are selected and no incorrect ones
        const isCorrect =
          correctOptions.length === userAnswers.length &&
          correctOptions.every((opt) => userAnswers.includes(opt));

        return total + (isCorrect ? question.points : 0);
      }

      return total;
    }, 0);

    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

    setShowResults(true);
    onComplete({
      score,
      total: totalPoints,
      answers,
      timeSpent,
    });
  };

  const getQuestionResult = (question: QuizQuestion) => {
    const userAnswer = answers[question.id];

    if (!userAnswer) return { correct: false, points: 0 };

    if (question.type === "single") {
      const selectedOption = question.options?.find(
        (opt) => opt.id === userAnswer
      );
      return {
        correct: selectedOption?.correct || false,
        points: selectedOption?.correct ? question.points : 0,
      };
    } else if (question.type === "multiple") {
      const userAnswers = userAnswer as string[];
      const correctOptions =
        question.options?.filter((opt) => opt.correct).map((opt) => opt.id) ||
        [];

      const isCorrect =
        correctOptions.length === userAnswers.length &&
        correctOptions.every((opt) => userAnswers.includes(opt));

      return {
        correct: isCorrect,
        points: isCorrect ? question.points : 0,
      };
    }

    return { correct: false, points: 0 };
  };

  if (showResults) {
    const totalScore = questions.reduce(
      (sum, q) => sum + getQuestionResult(q).points,
      0
    );
    const totalPossible = questions.reduce((sum, q) => sum + q.points, 0);
    const percentage = Math.round((totalScore / totalPossible) * 100);

    return (
      <Card variant="elevated" className={`p-6 ${className}`}>
        <div className="text-center space-y-6">
          {/* Results Header */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Quiz Complete!
            </h2>
            <p className="text-gray-600">
              You scored {totalScore} out of {totalPossible} points (
              {percentage}%)
            </p>
          </div>

          {/* Score Circle */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={
                    percentage >= 70
                      ? "#10B981"
                      : percentage >= 50
                      ? "#F59E0B"
                      : "#EF4444"
                  }
                  strokeWidth="3"
                  strokeDasharray={`${percentage}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{percentage}%</span>
              </div>
            </div>
          </div>

          {/* Questions Review */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Review Answers
            </h3>
            {questions.map((question, index) => {
              const result = getQuestionResult(question);

              return (
                <Card key={question.id} variant="outlined" className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm ${
                        result.correct ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {result.correct ? "✓" : "✗"}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-2">
                        {index + 1}. {question.question}
                      </h4>

                      {question.explanation && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-3">
                          <p className="text-sm text-blue-800">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      )}

                      <p className="text-sm text-gray-600">
                        Score: {result.points}/{question.points}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-center pt-6">
            {allowRetry && (
              <Button
                variant="outline"
                label="Retry Quiz"
                onClick={() => window.location.reload()}
              />
            )}
            <Button
              variant="primary"
              label="Continue Learning"
              onClick={() => window.history.back()}
            />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className={`p-6 ${className}`}>
      {/* Quiz Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Quiz</h2>
          <p className="text-gray-600">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>

        {timeLimit && (
          <div className="text-right">
            <div className="text-sm text-gray-600">Time Remaining</div>
            <div
              className={`text-lg font-bold ${
                timeLeft < 60 ? "text-red-600" : "text-gray-900"
              }`}
            >
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <ProgressBar value={progress} showLabel={false} className="mb-6" />

      {/* Current Question */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {currentQ.question}
          </h3>
          <p className="text-sm text-gray-600 mb-2">
            {currentQ.points} point{currentQ.points !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Answer Options */}
        <div className="space-y-3">
          {currentQ.type === "single" && currentQ.options && (
            <RadioGroup
              options={currentQ.options.map((opt) => ({
                value: opt.id,
                label: opt.text,
              }))}
              value={answers[currentQ.id] as string}
              onChange={handleAnswerChange}
              direction="vertical"
            />
          )}

          {currentQ.type === "multiple" && currentQ.options && (
            <div className="space-y-2">
              {currentQ.options.map((option) => (
                <Checkbox
                  key={option.id}
                  label={option.text}
                  checked={((answers[currentQ.id] as string[]) || []).includes(
                    option.id
                  )}
                  onChange={(e) => {
                    const currentAnswers =
                      (answers[currentQ.id] as string[]) || [];
                    let newAnswers: string[];

                    if (e.target.checked) {
                      newAnswers = [...currentAnswers, option.id];
                    } else {
                      newAnswers = currentAnswers.filter(
                        (id) => id !== option.id
                      );
                    }

                    handleAnswerChange(newAnswers);
                  }}
                />
              ))}
            </div>
          )}

          {currentQ.type === "text" && (
            <textarea
              value={(answers[currentQ.id] as string) || ""}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            label="Previous"
            onClick={handlePrevious}
            disabled={currentQuestion === 0}
          />

          <Button
            variant="primary"
            label={
              currentQuestion === questions.length - 1
                ? "Submit Quiz"
                : "Next Question"
            }
            onClick={handleNext}
            disabled={
              !answers[currentQ.id] ||
              (Array.isArray(answers[currentQ.id]) &&
                (answers[currentQ.id] as string[]).length === 0)
            }
          />
        </div>
      </div>
    </Card>
  );
}
