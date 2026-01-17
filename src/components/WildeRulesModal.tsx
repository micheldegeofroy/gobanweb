'use client';

import { useState } from 'react';

interface WildeRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'rules' | 'terms';

export function WildeRulesModal({ isOpen, onClose }: WildeRulesModalProps) {
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
          <h2 className="text-xl font-bold text-white">Wilde Go Rules</h2>
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
                <h3 className="text-white font-semibold mb-2">Multi-Player Go</h3>
                <p>Wilde Go supports 2-8 players on customizable rectangular boards. Each player has a unique color.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Turn Order</h3>
                <p>Players take turns in order by their color. You can only place stones on your turn - the highlighted pot shows whose turn it is.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Rectangular Boards</h3>
                <p>Unlike standard Go, Wilde supports rectangular boards (e.g., 19x13, 9x19). This creates asymmetric gameplay and new strategic possibilities.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Capturing</h3>
                <p>Standard Go capturing rules apply. Surround opponent stones to capture them. The capturing player scores all captured stones.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Ko Rule</h3>
                <p>You cannot immediately recapture a ko. With multiple players, ko fights can involve more than two participants!</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Scoring</h3>
                <p>Each player counts their captured stones. Territory can be divided among multiple players - agree on rules before starting.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Custom Colors</h3>
                <p>Each player has a distinct color for easy identification. Colors are assigned based on player order.</p>
              </section>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Turn Order</span>
                <p className="mt-1">Players rotate in fixed order. Watch the highlighted pot to know whose turn it is.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Atari</span>
                <p className="mt-1">A group with one liberty remaining. With multiple opponents, atari can come from anywhere!</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Liberty</span>
                <p className="mt-1">Empty adjacent points. Edge and corner positions have fewer liberties.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Group</span>
                <p className="mt-1">Connected stones of one color. In multi-player, a group can be threatened by several opponents simultaneously.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Rectangular Board</span>
                <p className="mt-1">Boards can be wider than tall or vice versa. Corners and edges behave differently on non-square boards.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Multi-way Ko</span>
                <p className="mt-1">Ko situations involving 3+ players. More complex than 2-player ko!</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Captured</span>
                <p className="mt-1">Stones you&apos;ve taken from opponents. Worth one point each.</p>
              </div>

              <div className="pb-3">
                <span className="text-[#DEB887] font-semibold">Pot</span>
                <p className="mt-1">Your available stones. Highlighted when it&apos;s your turn to play.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
