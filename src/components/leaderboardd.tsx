"use client";
import {FaCrown} from "react-icons/fa";

interface User {
  name: string;
  score: number;
}

const leaderboard: User[] = [
  {name: "Emeka_Nnamdi", score: 120},
  {name: "Ada_notes", score: 110},
  {name: "Lecturer247", score: 95},
];

export const Leaderboard = () => (
  <section className="py-16 bg-white px-4">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">
        📊 Top Contributors This Week
      </h2>
      <div className="bg-gray-50 rounded-xl p-6 shadow-md">
        <ul className="space-y-4">
          {leaderboard.map((user, index) => (
            <li
              key={index}
              className="flex items-center justify-between p-3 bg-white rounded-lg hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-gray-800">
                  {index + 1}.
                </span>
                <span className="text-gray-700 font-medium">{user.name}</span>
                {index === 0 && <FaCrown className="text-yellow-500" />}
              </div>
              <span className="font-semibold text-blue-600">
                {user.score} pts
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);