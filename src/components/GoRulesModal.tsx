'use client';

import { useState } from 'react';

interface GoRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Tab = 'rules' | 'terms';

export function GoRulesModal({ isOpen, onClose }: GoRulesModalProps) {
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
          <h2 className="text-xl font-bold text-white">Go Rules</h2>
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
            Basic Rules
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
                <h3 className="text-white font-semibold mb-2">Objective</h3>
                <p>Control more territory than your opponent by surrounding empty intersections with your stones.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Placing Stones</h3>
                <p>Players alternate turns placing one stone on an empty intersection. Black plays first. Once placed, stones do not move (but can be captured).</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Liberties</h3>
                <p>Each stone has liberties - the empty points directly adjacent (up, down, left, right). Connected stones of the same color share liberties as a group.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Capturing</h3>
                <p>When a stone or group has no liberties remaining (completely surrounded), it is captured and removed from the board. Captured stones count as points for the capturing player.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Ko Rule</h3>
                <p>You cannot make a move that recreates the exact board position from your previous turn. This prevents infinite loops of capturing back and forth.</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Suicide Rule</h3>
                <p>You cannot place a stone that would have zero liberties, unless that move captures opponent stones (giving your stone liberties).</p>
              </section>

              <section>
                <h3 className="text-white font-semibold mb-2">Scoring</h3>
                <p><strong>Territory:</strong> Empty points surrounded by your stones.<br/>
                <strong>Captures:</strong> Opponent stones you captured.<br/>
                <strong>Komi:</strong> White receives 6.5 points compensation for going second.</p>
              </section>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Atari</span>
                <p className="mt-1">A stone or group with only one liberty remaining. One more opponent move will capture it.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Liberty</span>
                <p className="mt-1">An empty point adjacent to a stone. Stones need at least one liberty to stay on the board.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Group / Chain</span>
                <p className="mt-1">Connected stones of the same color that share liberties and live or die together.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Eye</span>
                <p className="mt-1">An empty point completely surrounded by one color. A group with two eyes cannot be captured.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Ko</span>
                <p className="mt-1">A situation where players could capture back and forth forever. The Ko rule prevents immediate recapture.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Seki</span>
                <p className="mt-1">A mutual life situation where neither player can capture the other without losing their own stones.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Territory</span>
                <p className="mt-1">Empty points surrounded by your stones that count as points at game end.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Komi</span>
                <p className="mt-1">Points given to White to compensate for Black&apos;s first-move advantage. Usually 6.5 points.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Joseki</span>
                <p className="mt-1">Established sequences of moves, usually in corners, considered fair for both players.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Fuseki</span>
                <p className="mt-1">The opening phase of the game where players stake out territory across the board.</p>
              </div>

              <div className="border-b border-[#444] pb-3">
                <span className="text-[#DEB887] font-semibold">Tenuki</span>
                <p className="mt-1">Playing elsewhere on the board instead of responding to your opponent&apos;s last move.</p>
              </div>

              <div className="pb-3">
                <span className="text-[#DEB887] font-semibold">Dame</span>
                <p className="mt-1">Neutral points that belong to neither player and are worth no points.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
