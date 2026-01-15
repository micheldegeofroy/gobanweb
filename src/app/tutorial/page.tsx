'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import TutorialBoard from '@/components/TutorialBoard';

type Stone = 0 | 1 | null;
type Board = Stone[][];
type Position = { x: number; y: number };

interface TutorialStep {
  title: string;
  description: string;
  board: Board;
  lastMove?: Position | null;
  highlights?: { positions: Position[]; color: string }[];
  showLiberties?: Position | null;
  crossMarkers?: Position[];
  captureAnimation?: { x: number; y: number; color: 0 | 1 };
  appearAnimation?: { x: number; y: number; color: 0 | 1 };
  bubblePosition?: 'top' | 'bottom' | 'left' | 'right';
  bubbleTarget?: Position;
}

// Create empty 9x9 board
const emptyBoard = (): Board => Array(9).fill(null).map(() => Array(9).fill(null));

// Clone and modify board
const withStones = (stones: { x: number; y: number; color: 0 | 1 }[]): Board => {
  const board = emptyBoard();
  for (const s of stones) {
    board[s.y][s.x] = s.color;
  }
  return board;
};

// Tutorial steps
const tutorialSteps: TutorialStep[] = [
  {
    title: "Welcome to Go!",
    description: "Go is played on a grid. Two players take turns placing black and white stones. Black always plays first. Let's learn the basics!",
    board: emptyBoard(),
  },
  {
    title: "Placing Stones",
    description: "Stones are placed on the intersections (where lines cross), not in the squares. Once placed, stones don't move unless captured out of breath.",
    board: withStones([{ x: 4, y: 4, color: 0 }]),
  },
  {
    title: "Taking Turns",
    description: "Players alternate. Black plays, then White responds. The game builds up as both sides place stones.",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 1 },
    ]),
  },
  {
    title: "Breathing - The Key Concept",
    description: "Kokyūten in Japanese literally means 'breathing point'. Every stone needs to 'breathe' - empty points directly adjacent (up, down, left, right). The black crosses show this stone's 4 breaths.",
    board: withStones([{ x: 4, y: 4, color: 0 }]),
    showLiberties: { x: 4, y: 4 },
  },
  {
    title: "Edge Breathing",
    description: "Stones on the edge have less breathing space (3 instead of 4). Corner stones have only 2. This makes edges and corners more dangerous!",
    board: withStones([{ x: 0, y: 4, color: 0 }]),
    showLiberties: { x: 0, y: 4 },
  },
  {
    title: "Reducing Breathing Points",
    description: "When you place a stone next to an opponent's stone, you reduce their breathing space. Here White has reduced Black's breathing spaces from 4 to 3.",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 1 },
    ]),
    showLiberties: { x: 4, y: 4 },
  },
  {
    title: "Surrounding a Stone",
    description: "White continues to surround Black. Now Black has only 2 breaths left. Black is in danger!",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 1 },
      { x: 3, y: 4, color: 1 },
    ]),
    showLiberties: { x: 4, y: 4 },
  },
  {
    title: "Almost Captured",
    description: "Now Black has only 1 breath left (called 'atari'). One more White stone and Black will be captured!",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 1 },
      { x: 3, y: 4, color: 1 },
      { x: 4, y: 3, color: 1 },
    ]),
    showLiberties: { x: 4, y: 4 },
  },
  {
    title: "Capture!",
    description: "White plays on Black's last breath. The Black stone is captured and removed from the board! White keeps it as a prisoner.",
    board: withStones([
      { x: 5, y: 4, color: 1 },
      { x: 3, y: 4, color: 1 },
      { x: 4, y: 3, color: 1 },
      { x: 4, y: 5, color: 1 },
    ]),
    captureAnimation: { x: 4, y: 4, color: 0 },
  },
  {
    title: "Connected Groups",
    description: "Stones of the same color that touch (horizontally or vertically) form a group. They share their breathing and live together as long as one connected stone can breath.",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 0 },
      { x: 4, y: 5, color: 0 },
    ]),
  },
  {
    title: "Group Breathing",
    description: "This 3-stone group shares 7 breathing spaces. Groups are stronger than single stones because they have more breathing space!",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 0 },
      { x: 4, y: 5, color: 0 },
    ]),
    showLiberties: { x: 4, y: 4 },
  },
  {
    title: "No Suicide Rule",
    description: "You cannot place a stone where it would have no breathing (suicide), unless that move captures opponent stones.",
    board: withStones([
      { x: 3, y: 4, color: 1 },
      { x: 5, y: 4, color: 1 },
      { x: 4, y: 3, color: 1 },
      { x: 4, y: 5, color: 1 },
    ]),
  },
  {
    title: "The Ko Rule",
    description: "The rule states that a move cannot be played such that it causes the board to look exactly the same as it did at the end of the player's last move.",
    board: withStones([
      { x: 3, y: 3, color: 1 }, { x: 4, y: 3, color: 0 },
      { x: 2, y: 4, color: 1 }, { x: 5, y: 4, color: 0 },
      { x: 3, y: 5, color: 1 }, { x: 4, y: 5, color: 0 },
    ]),
    appearAnimation: { x: 3, y: 4, color: 0 },
    captureAnimation: { x: 4, y: 4, color: 1 },
  },
  {
    title: "Eyes - The Secret to Life",
    description: "An 'eye' is an empty point completely surrounded by your stones, here marked by crosses. Groups with TWO eyes can never be captured - they're alive forever!",
    board: withStones([
      { x: 2, y: 2, color: 0 }, { x: 3, y: 2, color: 0 }, { x: 4, y: 2, color: 0 }, { x: 5, y: 2, color: 0 },
      { x: 2, y: 3, color: 0 }, { x: 5, y: 3, color: 0 },
      { x: 2, y: 4, color: 0 }, { x: 3, y: 4, color: 0 }, { x: 4, y: 4, color: 0 }, { x: 5, y: 4, color: 0 },
    ]),
    crossMarkers: [{ x: 3, y: 3 }, { x: 4, y: 3 }],
  },
  {
    title: "Territory",
    description: "The goal is to control territory - empty areas surrounded by your stones. At the end, you count your territory plus captured stones.",
    board: withStones([
      { x: 0, y: 3, color: 0 }, { x: 1, y: 3, color: 0 }, { x: 2, y: 3, color: 0 },
      { x: 2, y: 4, color: 0 }, { x: 2, y: 5, color: 0 }, { x: 2, y: 6, color: 0 },
      { x: 0, y: 6, color: 0 }, { x: 1, y: 6, color: 0 },
      { x: 6, y: 2, color: 1 }, { x: 7, y: 2, color: 1 }, { x: 8, y: 2, color: 1 },
      { x: 6, y: 3, color: 1 }, { x: 6, y: 4, color: 1 },
    ]),
    crossMarkers: [
      { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 5 }, { x: 1, y: 5 },
      { x: 7, y: 0 }, { x: 8, y: 0 }, { x: 7, y: 1 }, { x: 8, y: 1 },
    ],
  },
  {
    title: "You're Ready!",
    description: "You know the basics! Start with 9x9 boards to practice. Remember: connect your stones, make eyes, and surround territory. Have fun!",
    board: withStones([
      { x: 2, y: 2, color: 0 }, { x: 3, y: 3, color: 1 },
      { x: 5, y: 2, color: 1 }, { x: 6, y: 3, color: 0 },
      { x: 2, y: 5, color: 1 }, { x: 3, y: 6, color: 0 },
      { x: 5, y: 6, color: 0 }, { x: 6, y: 5, color: 1 },
      { x: 4, y: 4, color: 0 },
    ]),
  },
];

export default function TutorialPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const step = tutorialSteps[currentStep];

  const goToStep = (index: number) => {
    if (index >= 0 && index < tutorialSteps.length) {
      setCurrentStep(index);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-zinc-900 dark:to-zinc-800">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4 max-w-sm">
        {/* Board */}
        <div className="mb-4">
          <TutorialBoard
            board={step.board}
            size={9}
            lastMove={step.lastMove}
            highlights={step.highlights}
            showLiberties={step.showLiberties}
            crossMarkers={step.crossMarkers}
            captureAnimation={step.captureAnimation}
            appearAnimation={step.appearAnimation}
          />
        </div>

        {/* Explanation box with navigation */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-3 min-h-[28px]">
            {step.title}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6 min-h-[144px]">
            {step.description}
          </p>

          {/* Navigation inside box */}
          <div className="flex items-center justify-between">
            {currentStep === 0 ? (
              <button
                onClick={() => router.push('/')}
                className="w-24 py-2 bg-white text-zinc-800 rounded-lg font-bold hover:bg-zinc-100 transition-colors"
              >
                Home
              </button>
            ) : (
              <button
                onClick={() => goToStep(currentStep - 1)}
                className="w-24 py-2 bg-white text-zinc-800 rounded-lg font-bold hover:bg-zinc-100 transition-colors"
              >
                Previous
              </button>
            )}

            {currentStep === tutorialSteps.length - 1 ? (
              <button
                onClick={() => router.push('/')}
                className="w-24 py-2 bg-white text-zinc-800 rounded-lg font-bold hover:bg-zinc-100 transition-colors"
              >
                Home
              </button>
            ) : (
              <button
                onClick={() => goToStep(currentStep + 1)}
                className="w-24 py-2 bg-white text-zinc-800 rounded-lg font-bold hover:bg-zinc-100 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
