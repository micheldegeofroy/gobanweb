'use client';

import { useState } from 'react';

interface CrazyRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'rules' | 'terms';

export function CrazyRulesModal({ isOpen, onClose }: CrazyRulesModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('rules');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={onClose}>
      <div
        className="bg-[#2a2a2a] rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#444]">
          <h2 className="text-xl font-bold text-white">Crazy Go Rules</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#444]">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'rules'
                ? 'text-[#DEB887] border-b-2 border-[#DEB887]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Rules
          </button>
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              activeTab === 'terms'
                ? 'text-[#DEB887] border-b-2 border-[#DEB887]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Terminology
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh] text-gray-300 text-sm leading-relaxed">
          {activeTab === 'rules' ? (
            <div className="space-y-4">
              <section>
                <h3 className="text-white font-semibold mb-2">4-Player Go</h3>
                <p>Crazy Go is a 4-player variant of Go. Four colors play in turn order: <span className="text-gray-100">Black</span>, <span className="text-gray-100">White</span>, <span className="text-amber-600">Brown</span>, <span className="text-gray-400">Grey</span>.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Turn Order</h3>
                <p>Players take turns in fixed order. The current player is indicated by the highlighted stone pot. You can only place stones of your color on your turn.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Alliances</h3>
                <p>There are no fixed alliances. You may cooperate with or attack any player. Diplomacy happens outside the game!</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Capturing</h3>
                <p>Capturing works the same as standard Go. When a group has no liberties, it is captured. The player who makes the capturing move gets credit for all captured stones.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Ko Rule</h3>
                <p>The Ko rule applies: you cannot immediately recapture a single stone that was just captured if it would recreate the previous position.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Scoring</h3>
                <p>Each player scores their captured stones. Territory scoring can be complex with 4 players - agree on rules before playing!</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Strategy Tips</h3>
                <p>Watch all opponents, not just one. A weak group can be attacked by multiple players. Balance offense and defense across the whole board.</p>
              </section>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Turn Order</span>
                <p className="mt-1">Black → White → Brown → Grey → Black... The cycle continues until the game ends.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Atari</span>
                <p className="mt-1">A stone or group with only one liberty. Any of the other 3 players could capture it!</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Liberty</span>
                <p className="mt-1">An empty point adjacent to a stone. Groups need at least one liberty to survive.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Group</span>
                <p className="mt-1">Connected stones of the same color sharing liberties. In 4-player, groups can be surrounded by multiple opponents.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Crossfire</span>
                <p className="mt-1">When multiple players threaten the same group. A common 4-player situation.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Kingmaker</span>
                <p className="mt-1">A player who can&apos;t win but can decide who does by their moves. Be careful not to become one!</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Captured</span>
                <p className="mt-1">Stones you&apos;ve captured from opponents. Each captured stone is worth one point.</p>
              </div>

              <div className="pb-3">
                <span className="text-[#DEB887] font-semibold">Pot</span>
                <p className="mt-1">Your supply of unplayed stones. When empty, you can only move existing stones.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
