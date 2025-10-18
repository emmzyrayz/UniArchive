"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, Button, RadioGroup, Checkbox, Alert } from "@/components/UI";
import { ProgressBar } from "@/components/reuse";
import { LuCheck, LuX, LuClock } from "react-icons/lu";

interface QuizOption {
  id: string;
  text: string;
  correct?: boolean;
}

interface QuizQuestion {
  id: string;
  type: "single" | "multiple" | "text";
  question: string;
  options?: QuizOption[];
  explanation?: string;
  points: number;
}

interface QuizResults {
  score: number;
  total: number;
  answers: Record<string, string | string[]>;
  timeSpent: number;
}

interface QuizFormProps {
  questions: QuizQuestion[];
  onComplete: (results: QuizResults) => void;
  timeLimit?: number;
  allowRetry?: boolean;
  className?: string;
  storageKey?: string;
}

export default function QuizForm({
  questions,
  onComplete,
  timeLimit,
  allowRetry = false,
  className = "",
  storageKey = "quizProgress",
}: QuizFormProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [timeExpired, setTimeExpired] = useState(false);

  const currentQ = questions[currentQuestion];
  const progress = useMemo(
    () => ((currentQuestion + 1) / questions.length) * 100,
    [currentQuestion, questions.length]
  );
  const timeLeft = useMemo(
    () => (timeLimit ? Math.max(0, timeLimit * 60 - timeSpent) : 0),
    [timeLimit, timeSpent]
  );

  // Restore saved progress
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const {
          answers: savedAnswers,
          timeSpent: savedTime,
          currentQuestion: savedQ,
        } = JSON.parse(saved);
        if (savedAnswers) setAnswers(savedAnswers);
        if (savedTime !== undefined) setTimeSpent(savedTime);
        if (savedQ !== undefined) setCurrentQuestion(savedQ);
      }
    } catch (error) {
      console.error("Failed to restore quiz progress:", error);
    }
  }, [storageKey]);

  // Save progress to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ answers, timeSpent, currentQuestion })
      );
    } catch (error) {
      console.error("Failed to save quiz progress:", error);
    }
  }, [answers, timeSpent, currentQuestion, storageKey]);

  const handleAnswerChange = useCallback(
    (value: string | string[]) => {
      setAnswers((prev) => ({
        ...prev,
        [currentQ.id]: value,
      }));
    },
    [currentQ.id]
  );

  const getQuestionResult = useCallback(
    (question: QuizQuestion) => {
      const userAnswer = answers[question.id];
      if (!userAnswer) return { correct: false, points: 0 };

      if (question.type === "single") {
        const selected = question.options?.find((opt) => opt.id === userAnswer);
        return {
          correct: !!selected?.correct,
          points: selected?.correct ? question.points : 0,
        };
      } else if (question.type === "multiple") {
        const userAnswers = userAnswer as string[];
        const correctOptions =
          question.options?.filter((opt) => opt.correct).map((opt) => opt.id) ||
          [];
        const isCorrect =
          correctOptions.length === userAnswers.length &&
          correctOptions.every((opt) => userAnswers.includes(opt));
        return { correct: isCorrect, points: isCorrect ? question.points : 0 };
      } else if (question.type === "text" && question.explanation) {
        const correctAnswer = question.explanation.trim().toLowerCase();
        const userText = (userAnswer as string).trim().toLowerCase();
        const isCorrect = userText === correctAnswer;
        return { correct: isCorrect, points: isCorrect ? question.points : 0 };
      }

      return { correct: false, points: 0 };
    },
    [answers]
  );

  const calculateScore = useCallback(() => {
    const score = questions.reduce((total, question) => {
      return total + getQuestionResult(question).points;
    }, 0);
    const total = questions.reduce((sum, q) => sum + q.points, 0);
    return { score, total };
  }, [questions, getQuestionResult]);

  const handleSubmit = useCallback(() => {
    const { score, total } = calculateScore();
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error("Failed to clear quiz progress:", error);
    }
    setShowResults(true);
    onComplete({ score, total, answers, timeSpent });
  }, [calculateScore, answers, timeSpent, onComplete, storageKey]);

  const handleNext = useCallback(() => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  }, [currentQuestion, questions.length, handleSubmit]);

  const handlePrevious = useCallback(() => {
    setCurrentQuestion((prev) => Math.max(0, prev - 1));
  }, []);

  // Timer logic
  useEffect(() => {
    if (!timeLimit || showResults) return;

    const timer = setInterval(() => {
      setTimeSpent((prev) => {
        const newTime = prev + 1;
        if (newTime >= timeLimit * 60) {
          setTimeExpired(true);
          // Schedule submit to avoid state update in event handler
          setTimeout(() => handleSubmit(), 0);
          clearInterval(timer);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLimit, showResults, handleSubmit]);

  const isCurrentAnswered =
    answers[currentQ.id] !== undefined &&
    (typeof answers[currentQ.id] === "string"
      ? (answers[currentQ.id] as string).length > 0
      : (answers[currentQ.id] as string[]).length > 0);

  // Results screen
  if (showResults) {
    const { score: totalScore, total: totalPossible } = calculateScore();
    const percentage =
      totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    const minutes = Math.floor(timeSpent / 60);
    const seconds = timeSpent % 60;

    const resultType =
      percentage >= 70 ? "success" : percentage >= 50 ? "warning" : "error";
    const resultMessage =
      percentage >= 70
        ? "Excellent work! You've mastered this topic."
        : percentage >= 50
        ? "Good effort! Review the explanations to improve."
        : "Keep practicing! Review and try again.";

    return (
      <Card variant="elevated" padding="md" className={className}>
        <div className="text-center space-y-6">
          {timeExpired && (
            <Alert
              type="warning"
              title="Time Expired"
              message="The quiz was automatically submitted because time ran out."
            />
          )}

          <div>
            <h2 className="text-2xl font-bold text-black mb-2">
              Quiz Complete!
            </h2>
            <p className="text-gray-600">
              You scored {totalScore} out of {totalPossible} ({percentage}%)
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Time taken: {minutes}m {seconds.toString().padStart(2, "0")}s
            </p>
          </div>

          {/* Circular progress */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  d="M18 2.0845 a15.9155 15.9155 0 0 1 0 31.831 a15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a15.9155 15.9155 0 0 1 0 31.831 a15.9155 15.9155 0 0 1 0 -31.831"
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
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{percentage}%</span>
              </div>
            </div>
          </div>

          <Alert type={resultType} message={resultMessage} />

          {/* Review section */}
          <div className="space-y-4 text-left">
            <h3 className="text-lg font-semibold text-black text-center">
              Review Your Answers
            </h3>
            {questions.map((question, index) => {
              const result = getQuestionResult(question);
              return (
                <Card key={question.id} variant="outlined" padding="sm">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white ${
                        result.correct ? "bg-green-500" : "bg-red-500"
                      }`}
                    >
                      {result.correct ? (
                        <LuCheck className="w-5 h-5" />
                      ) : (
                        <LuX className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-black mb-2">
                        {index + 1}. {question.question}
                      </h4>
                      {question.explanation && (
                        <div className="bg-blue-50 p-3 rounded-lg mb-3 border-l-4 border-blue-500">
                          <p className="text-sm text-blue-900">
                            <strong>Explanation:</strong> {question.explanation}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-600">
                          Score: {result.points}/{question.points}
                        </p>
                        {result.correct && (
                          <span className="text-xs text-green-600 font-medium">
                            Correct ✓
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="flex gap-3 justify-center pt-6 flex-wrap">
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

  // Active question screen
  return (
    <Card variant="elevated" padding="md" className={className}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-black">Quiz</h2>
          <p className="text-gray-600 text-sm">
            Question {currentQuestion + 1} of {questions.length}
          </p>
        </div>

        {timeLimit && (
          <div className="text-right">
            <div className="text-sm text-gray-600 flex items-center gap-1 justify-end">
              <LuClock className="w-4 h-4" />
              Time Remaining
            </div>
            <div
              className={`text-lg font-bold ${
                timeLeft < 60 ? "text-red-600 animate-pulse" : "text-black"
              }`}
            >
              {Math.floor(timeLeft / 60)}:
              {(timeLeft % 60).toString().padStart(2, "0")}
            </div>
          </div>
        )}
      </div>

      {timeLimit && timeLeft < 60 && timeLeft > 0 && (
        <Alert
          type="warning"
          message="Less than 1 minute remaining!"
          className="mb-4"
        />
      )}

      <ProgressBar
        value={progress}
        max={100}
        showLabel={false}
        className="mb-6"
      />

      {/* Question */}
      <div key={currentQ.id} className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-black mb-4">
            {currentQ.question}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Worth {currentQ.points} point{currentQ.points !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="space-y-3">
          {currentQ.type === "single" && currentQ.options && (
            <RadioGroup
              name={`question-${currentQ.id}`}
              options={currentQ.options.map((opt) => ({
                value: opt.id,
                label: opt.text,
              }))}
              value={answers[currentQ.id] as string}
              onChange={(value) => handleAnswerChange(value)}
              direction="vertical"
            />
          )}

          {currentQ.type === "multiple" && currentQ.options && (
            <div className="space-y-2">
              {currentQ.options.map((opt) => (
                <Checkbox
                  key={opt.id}
                  label={opt.text}
                  checked={((answers[currentQ.id] as string[]) || []).includes(
                    opt.id
                  )}
                  onChange={(e) => {
                    const currentAnswers =
                      (answers[currentQ.id] as string[]) || [];
                    const newAnswers = e.target.checked
                      ? [...currentAnswers, opt.id]
                      : currentAnswers.filter((id) => id !== opt.id);
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
              className="w-full h-32 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition-colors text-black"
              aria-label="Text answer"
            />
          )}
        </div>

        <div className="flex justify-between gap-3 pt-6 border-t border-gray-200 flex-wrap">
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
            disabled={!isCurrentAnswered}
          />
        </div>
      </div>
    </Card>
  );
}

// Usage Examples:
// "use client";

// import QuizForm from "@/components/QuizForm";
// import { Card, Button } from "@/components/UI";
// import { useState } from "react";

// // Example 1: Basic Multiple Choice Quiz
// export function BasicQuizExample() {
//   const [completed, setCompleted] = useState(false);
//   const [results, setResults] = useState<any>(null);

//   const questions = [
//     {
//       id: "q1",
//       type: "single" as const,
//       question: "What is the capital of France?",
//       points: 1,
//       options: [
//         { id: "a", text: "London", correct: false },
//         { id: "b", text: "Paris", correct: true },
//         { id: "c", text: "Berlin", correct: false },
//         { id: "d", text: "Madrid", correct: false },
//       ],
//       explanation: "Paris is the capital of France.",
//     },
//     {
//       id: "q2",
//       type: "single" as const,
//       question: "Which planet is closest to the sun?",
//       points: 1,
//       options: [
//         { id: "a", text: "Venus", correct: false },
//         { id: "b", text: "Mercury", correct: true },
//         { id: "c", text: "Earth", correct: false },
//         { id: "d", text: "Mars", correct: false },
//       ],
//       explanation: "Mercury is the smallest and closest planet to the sun.",
//     },
//   ];

//   const handleComplete = (results: any) => {
//     setResults(results);
//     setCompleted(true);
//   };

//   if (completed) {
//     return (
//       <Card variant="elevated" className="p-6 text-center">
//         <h3 className="text-xl font-bold text-black mb-2">Quiz Completed!</h3>
//         <p className="text-gray-600 mb-4">
//           Score: {results.score}/{results.total}
//         </p>
//         <Button
//           label="Retake Quiz"
//           onClick={() => setCompleted(false)}
//         />
//       </Card>
//     );
//   }

//   return <QuizForm questions={questions} onComplete={handleComplete} />;
// }

// // Example 2: Quiz with Multiple Answer Questions
// export function MultipleAnswerQuizExample() {
//   const questions = [
//     {
//       id: "q1",
//       type: "multiple" as const,
//       question: "Which of the following are programming languages? (Select all that apply)",
//       points: 2,
//       options: [
//         { id: "a", text: "Python", correct: true },
//         { id: "b", text: "Photoshop", correct: false },
//         { id: "c", text: "JavaScript", correct: true },
//         { id: "d", text: "HTML", correct: true },
//       ],
//       explanation: "Python, JavaScript, and HTML are all programming/markup languages. Photoshop is image editing software.",
//     },
//   ];

//   const handleComplete = (results: any) => {
//     console.log("Quiz results:", results);
//   };

//   return <QuizForm questions={questions} onComplete={handleComplete} />;
// }

// // Example 3: Quiz with Time Limit
// export function TimedQuizExample() {
//   const questions = [
//     {
//       id: "q1",
//       type: "single" as const,
//       question: "What is 2 + 2?",
//       points: 1,
//       options: [
//         { id: "a", text: "3", correct: false },
//         { id: "b", text: "4", correct: true },
//         { id: "c", text: "5", correct: false },
//       ],
//       explanation: "2 + 2 = 4",
//     },
//     {
//       id: "q2",
//       type: "text" as const,
//       question: "What is the largest planet in our solar system?",
//       points: 2,
//       explanation: "jupiter",
//     },
//   ];

//   return (
//     <QuizForm
//       questions={questions}
//       onComplete={(results) => console.log(results)}
//       timeLimit={5}
//       allowRetry={true}
//     />
//   );
// }

// // Example 4: Course Assessment Quiz
// export function CourseAssessmentQuiz() {
//   const questions = [
//     {
//       id: "react-basics-1",
//       type: "single" as const,
//       question: "What is JSX?",
//       points: 3,
//       options: [
//         {
//           id: "a",
//           text: "A syntax extension for JavaScript",
//           correct: true,
//         },
//         {
//           id: "b",
//           text: "A Java library",
//           correct: false,
//         },
//         {
//           id: "c",
//           text: "A CSS framework",
//           correct: false,
//         },
//       ],
//       explanation: "JSX is a syntax extension to JavaScript that produces React elements.",
//     },
//     {
//       id: "react-basics-2",
//       type: "multiple" as const,
//       question: "Which of these are React hooks? (Select all that apply)",
//       points: 4,
//       options: [
//         { id: "a", text: "useState", correct: true },
//         { id: "b", text: "useEffect", correct: true },
//         { id: "c", text: "useRouter", correct: false },
//         { id: "d", text: "useContext", correct: true },
//       ],
//       explanation: "useState, useEffect, and useContext are React hooks. useRouter is from Next.js.",
//     },
//     {
//       id: "react-basics-3",
//       type: "text" as const,
//       question: "What is the React hook used to manage component state?",
//       points: 2,
//       explanation: "usestate",
//     },
//   ];

//   const handleComplete = (results: any) => {
//     console.log("Assessment results:", {
//       score: results.score,
//       total: results.total,
//       percentage: Math.round((results.score / results.total) * 100),
//       timeSpent: results.timeSpent,
//     });
//   };

//   return (
//     <div className="p-6 space-y-6">
//       <div>
//         <h2 className="text-2xl font-bold text-black mb-2">React Fundamentals Assessment</h2>
//         <p className="text-gray-600">
//           Test your understanding of React basics. Total points: 9
//         </p>
//       </div>
//       <QuizForm
//         questions={questions}
//         onComplete={handleComplete}
//         timeLimit={15}
//         allowRetry={true}
//       />
//     </div>
//   );
// }

// // Example 5: Complete Quiz Dashboard
// export default function QuizDashboard() {
//   const [selectedQuiz, setSelectedQuiz] = useState<string | null>(null);
//   const [quizResults, setQuizResults] = useState<Record<string, any>>({});

//   const quizzes = [
//     {
//       id: "basics",
//       title: "React Basics",
//       difficulty: "Beginner",
//       questions: 5,
//       timeLimit: 10,
//     },
//     {
//       id: "advanced",
//       title: "Advanced React Patterns",
//       difficulty: "Advanced",
//       questions: 8,
//       timeLimit: 30,
//     },
//     {
//       id: "typescript",
//       title: "TypeScript Fundamentals",
//       difficulty: "Intermediate",
//       questions: 6,
//       timeLimit: 15,
//     },
//   ];

//   const handleQuizComplete = (quizId: string, results: any) => {
//     setQuizResults((prev) => ({
//       ...prev,
//       [quizId]: results,
//     }));
//     setSelectedQuiz(null);
//   };

//   if (selectedQuiz === "basics") {
//     return (
//       <QuizForm
//         questions={[
//           {
//             id: "q1",
//             type: "single" as const,
//             question: "What does React stand for?",
//             points: 2,
//             options: [
//               { id: "a", text: "Reactive Engine", correct: false },
//               { id: "b", text: "JavaScript library", correct: true },
//               { id: "c", text: "Response Engine", correct: false },
//             ],
//             explanation: "React is a JavaScript library for building user interfaces.",
//           },
//         ]}
//         onComplete={(results) => handleQuizComplete("basics", results)}
//         timeLimit={10}
//       />
//     );
//   }

//   return (
//     <div className="bg-white min-h-screen p-8">
//       <div className="max-w-6xl mx-auto">
//         <div className="mb-12">
//           <h1 className="text-4xl font-bold text-black mb-2">Quiz Center</h1>
//           <p className="text-gray-600">Test your knowledge and track your progress</p>
//         </div>

//         <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
//           {quizzes.map((quiz) => {
//             const result = quizResults[quiz.id];
//             return (
//               <Card
//                 key={quiz.id}
//                 variant="outlined"
//                 className="p-6 hover:shadow-lg transition-shadow"
//               >
//                 <div className="space-y-4">
//                   <div>
//                     <h3 className="text-lg font-semibold text-black mb-1">
//                       {quiz.title}
//                     </h3>
//                     <div className="flex items-center justify-between text-sm">
//                       <span className="text-gray-600">{quiz.questions} questions</span>
//                       <span
//                         className={`px-2 py-1 rounded text-xs font-medium ${
//                           quiz.difficulty === "Beginner"
//                             ? "bg-green-100 text-green-700"
//                             : quiz.difficulty === "Intermediate"
//                               ? "bg-yellow-100 text-yellow-700"
//                               : "bg-red-100 text-red-700"
//                         }`}
//                       >
//                         {quiz.difficulty}
//                       </span>
//                     </div>
//                   </div>

//                   {result && (
//                     <div className="bg-indigo-50 p-3 rounded-lg">
//                       <p className="text-sm text-indigo-900">
//                         <strong>Last Score:</strong> {result.score}/{result.total}
//                       </p>
//                       <p className="text-xs text-indigo-700">
//                         {Math.round((result.score / result.total) * 100)}% • {Math.floor(result.timeSpent / 60)}m
//                       </p>
//                     </div>
//                   )}

//                   <Button
//                     variant={result ? "outline" : "primary"}
//                     label={result ? "Retake Quiz" : "Start Quiz"}
//                     onClick={() => setSelectedQuiz(quiz.id)}
//                     className="w-full"
//                   />
//                 </div>
//               </Card>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }