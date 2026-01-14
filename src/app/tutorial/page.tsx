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
    description: "Stones are placed on the intersections (where lines cross), not in the squares. Once placed, stones don't move unless captured.",
    board: withStones([{ x: 4, y: 4, color: 0 }]),
    lastMove: { x: 4, y: 4 },
    highlights: [{ positions: [{ x: 4, y: 4 }], color: '#3b82f6' }],
  },
  {
    title: "Taking Turns",
    description: "Players alternate. Black plays, then White responds. The game builds up as both sides place stones.",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 1 },
    ]),
    lastMove: { x: 5, y: 4 },
  },
  {
    title: "Liberties - The Key Concept",
    description: "Every stone needs 'liberties' - empty points directly adjacent (up, down, left, right). The orange dots show this stone's 4 liberties.",
    board: withStones([{ x: 4, y: 4, color: 0 }]),
    showLiberties: { x: 4, y: 4 },
  },
  {
    title: "Edge Liberties",
    description: "Stones on the edge have fewer liberties (3 instead of 4). Corner stones have only 2. This makes edges and corners more vulnerable!",
    board: withStones([{ x: 0, y: 4, color: 0 }]),
    showLiberties: { x: 0, y: 4 },
  },
  {
    title: "Reducing Liberties",
    description: "When you place a stone next to an opponent's stone, you reduce their liberties. White has reduced Black's liberties from 4 to 3.",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 1 },
    ]),
    showLiberties: { x: 4, y: 4 },
    highlights: [{ positions: [{ x: 5, y: 4 }], color: '#ef4444' }],
  },
  {
    title: "Surrounding a Stone",
    description: "White continues to surround Black. Now Black has only 2 liberties left. Black is in danger!",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 1 },
      { x: 3, y: 4, color: 1 },
    ]),
    showLiberties: { x: 4, y: 4 },
    lastMove: { x: 3, y: 4 },
  },
  {
    title: "Almost Captured",
    description: "Now Black has only 1 liberty left (called 'atari'). One more White stone and Black will be captured!",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 1 },
      { x: 3, y: 4, color: 1 },
      { x: 4, y: 3, color: 1 },
    ]),
    showLiberties: { x: 4, y: 4 },
    lastMove: { x: 4, y: 3 },
  },
  {
    title: "Capture!",
    description: "White plays on Black's last liberty. The Black stone is captured and removed from the board! White keeps it as a prisoner.",
    board: withStones([
      { x: 5, y: 4, color: 1 },
      { x: 3, y: 4, color: 1 },
      { x: 4, y: 3, color: 1 },
      { x: 4, y: 5, color: 1 },
    ]),
    lastMove: { x: 4, y: 5 },
    highlights: [{ positions: [{ x: 4, y: 4 }], color: '#ef4444' }],
  },
  {
    title: "Connected Groups",
    description: "Stones of the same color that touch (horizontally or vertically) form a group. They share liberties and live or die together.",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 0 },
      { x: 4, y: 5, color: 0 },
    ]),
    highlights: [{ positions: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 4, y: 5 }], color: '#3b82f6' }],
  },
  {
    title: "Group Liberties",
    description: "This 3-stone group shares 7 liberties total. Groups are stronger than single stones because they have more liberties!",
    board: withStones([
      { x: 4, y: 4, color: 0 },
      { x: 5, y: 4, color: 0 },
      { x: 4, y: 5, color: 0 },
    ]),
    showLiberties: { x: 4, y: 4 },
  },
  {
    title: "No Suicide Rule",
    description: "You cannot place a stone where it would have zero liberties (suicide), unless that move captures opponent stones.",
    board: withStones([
      { x: 3, y: 4, color: 1 },
      { x: 5, y: 4, color: 1 },
      { x: 4, y: 3, color: 1 },
      { x: 4, y: 5, color: 1 },
    ]),
    highlights: [{ positions: [{ x: 4, y: 4 }], color: '#ef4444' }],
  },
  {
    title: "The Ko Rule",
    description: "Ko prevents infinite loops. Black just captured a white stone here. White cannot immediately recapture - must play elsewhere first, then can retake.",
    board: withStones([
      { x: 3, y: 3, color: 1 }, { x: 4, y: 3, color: 0 },
      { x: 2, y: 4, color: 1 }, { x: 3, y: 4, color: 0 }, { x: 5, y: 4, color: 0 },
      { x: 3, y: 5, color: 1 }, { x: 4, y: 5, color: 0 },
      { x: 4, y: 4, color: 0 },
    ]),
    lastMove: { x: 4, y: 4 },
    highlights: [{ positions: [{ x: 4, y: 4 }], color: '#3b82f6' }, { positions: [{ x: 3, y: 4 }], color: '#ef4444' }],
  },
  {
    title: "Eyes - The Secret to Life",
    description: "An 'eye' is an empty point completely surrounded by your stones. Groups with TWO eyes can never be captured - they're alive forever!",
    board: withStones([
      { x: 2, y: 2, color: 0 }, { x: 3, y: 2, color: 0 }, { x: 4, y: 2, color: 0 }, { x: 5, y: 2, color: 0 },
      { x: 2, y: 3, color: 0 }, { x: 5, y: 3, color: 0 },
      { x: 2, y: 4, color: 0 }, { x: 3, y: 4, color: 0 }, { x: 4, y: 4, color: 0 }, { x: 5, y: 4, color: 0 },
    ]),
    highlights: [
      { positions: [{ x: 3, y: 3 }], color: '#22c55e' },
      { positions: [{ x: 4, y: 3 }], color: '#22c55e' },
    ],
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
    highlights: [
      { positions: [{ x: 0, y: 4 }, { x: 1, y: 4 }, { x: 0, y: 5 }, { x: 1, y: 5 }], color: '#3b82f6' },
      { positions: [{ x: 7, y: 0 }, { x: 8, y: 0 }, { x: 7, y: 1 }, { x: 8, y: 1 }], color: '#f59e0b' },
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
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm"
          >
            Home
          </button>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm"
          >
            Play Now
          </button>
        </div>

        {/* Board */}
        <div className="mb-6">
          <TutorialBoard
            board={step.board}
            size={9}
            lastMove={step.lastMove}
            highlights={step.highlights}
            showLiberties={step.showLiberties}
          />
        </div>

        {/* Explanation bubble */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-100 mb-3">
            {step.title}
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {step.description}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            className="px-6 py-3 bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 rounded-lg font-medium hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          {currentStep === tutorialSteps.length - 1 ? (
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors"
            >
              Start Playing!
            </button>
          ) : (
            <button
              onClick={() => goToStep(currentStep + 1)}
              className="px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
