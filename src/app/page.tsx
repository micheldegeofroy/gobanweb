'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface GameCardProps {
  title: string;
  subtitle: string;
  href: string;
  boardPreview: React.ReactNode;
  bgGradient: string;
  textColor?: string;
}

function GameCard({ title, subtitle, href, boardPreview, bgGradient, textColor = 'text-white' }: GameCardProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="group rounded-2xl shadow-xl overflow-hidden transition-all hover:scale-105 hover:shadow-2xl text-left w-full"
      style={{ background: bgGradient }}
    >
      <div className="p-6">
        {/* Board Preview */}
        <div className="aspect-square mb-4 rounded-xl overflow-hidden shadow-inner">
          {boardPreview}
        </div>

        {/* Title & Subtitle */}
        <h3 className={`text-xl font-bold ${textColor} group-hover:opacity-90`}>
          {title}
        </h3>
        <p className={`text-sm ${textColor} opacity-75`}>
          {subtitle}
        </p>
      </div>
    </button>
  );
}

// Mini board preview components
function ClassicBoardPreview() {
  return (
    <div
      className="w-full h-full relative"
      style={{
        backgroundColor: '#DEB887',
        backgroundImage: `
          linear-gradient(#8B5A2B 1px, transparent 1px),
          linear-gradient(90deg, #8B5A2B 1px, transparent 1px)
        `,
        backgroundSize: '20% 20%',
        backgroundPosition: '10% 10%',
      }}
    >
      {/* Sample stones */}
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-zinc-600 to-zinc-900 shadow-md" style={{ top: '10%', left: '10%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-white to-zinc-200 border border-zinc-300 shadow-md" style={{ top: '30%', left: '30%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-zinc-600 to-zinc-900 shadow-md" style={{ top: '30%', left: '50%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-white to-zinc-200 border border-zinc-300 shadow-md" style={{ top: '50%', left: '30%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-zinc-600 to-zinc-900 shadow-md" style={{ top: '50%', left: '70%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-white to-zinc-200 border border-zinc-300 shadow-md" style={{ top: '70%', left: '50%' }} />
    </div>
  );
}

function WildeBoardPreview() {
  const colors = ['#FF1493', '#00BFFF', '#32CD32', '#FFD700', '#FF6347', '#9370DB'];
  return (
    <div
      className="w-full h-full relative"
      style={{
        background: 'linear-gradient(135deg, #f0e6fa 0%, #e6f0fa 100%)',
        backgroundImage: `
          linear-gradient(#c4b5d4 1px, transparent 1px),
          linear-gradient(90deg, #c4b5d4 1px, transparent 1px)
        `,
        backgroundSize: '20% 20%',
        backgroundPosition: '10% 10%',
      }}
    >
      {/* Colorful stones */}
      {colors.map((color, i) => (
        <div
          key={i}
          className="absolute w-[18%] h-[18%] rounded-full shadow-md"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${color}cc, ${color})`,
            top: `${10 + (i % 3) * 25}%`,
            left: `${10 + Math.floor(i / 3) * 40 + (i % 2) * 15}%`,
          }}
        />
      ))}
    </div>
  );
}

function CrazyBoardPreview() {
  return (
    <div
      className="w-full h-full relative"
      style={{
        backgroundColor: '#DEB887',
        backgroundImage: `
          linear-gradient(#8B5A2B 1px, transparent 1px),
          linear-gradient(90deg, #8B5A2B 1px, transparent 1px)
        `,
        backgroundSize: '20% 20%',
        backgroundPosition: '10% 10%',
      }}
    >
      {/* Black stone */}
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-zinc-600 to-zinc-900 shadow-md" style={{ top: '10%', left: '10%' }} />
      {/* White stone */}
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-white to-zinc-200 border border-zinc-300 shadow-md" style={{ top: '10%', left: '50%' }} />
      {/* White-cross stone */}
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-white to-zinc-200 border border-zinc-300 shadow-md overflow-hidden" style={{ top: '50%', left: '30%' }}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-zinc-900" />
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-zinc-900" />
      </div>
      {/* Black-cross stone */}
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-zinc-600 to-zinc-900 shadow-md overflow-hidden" style={{ top: '50%', left: '70%' }}>
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white" />
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] bg-white" />
      </div>
    </div>
  );
}

function ZenBoardPreview() {
  return (
    <div
      className="w-full h-full relative"
      style={{
        backgroundColor: '#4a4a4a',
        backgroundImage: `
          linear-gradient(#333 1px, transparent 1px),
          linear-gradient(90deg, #333 1px, transparent 1px)
        `,
        backgroundSize: '20% 20%',
        backgroundPosition: '10% 10%',
      }}
    >
      {/* Black and white stones scattered */}
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-zinc-800 to-black border border-zinc-600 shadow-md" style={{ top: '10%', left: '30%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-white to-zinc-200 shadow-md" style={{ top: '30%', left: '10%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-zinc-800 to-black border border-zinc-600 shadow-md" style={{ top: '30%', left: '50%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-white to-zinc-200 shadow-md" style={{ top: '50%', left: '30%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-zinc-800 to-black border border-zinc-600 shadow-md" style={{ top: '70%', left: '50%' }} />
      <div className="absolute w-[18%] h-[18%] rounded-full bg-gradient-to-br from-white to-zinc-200 shadow-md" style={{ top: '70%', left: '70%' }} />
    </div>
  );
}

function DomBoardPreview() {
  const airbnbRed = '#FF5A5F';
  return (
    <div
      className="w-full h-full relative"
      style={{
        backgroundColor: '#f5f5f5',
        backgroundImage: `
          linear-gradient(#ddd 1px, transparent 1px),
          linear-gradient(90deg, #ddd 1px, transparent 1px)
        `,
        backgroundSize: '20% 20%',
        backgroundPosition: '10% 10%',
      }}
    >
      {/* Red stones */}
      <div
        className="absolute w-[18%] h-[18%] rounded-full shadow-md"
        style={{ top: '10%', left: '30%', background: `radial-gradient(circle at 30% 30%, #FF8A8F, ${airbnbRed})` }}
      />
      <div
        className="absolute w-[18%] h-[18%] rounded-full shadow-md"
        style={{ top: '30%', left: '50%', background: `radial-gradient(circle at 30% 30%, #FF8A8F, ${airbnbRed})` }}
      />
      <div
        className="absolute w-[18%] h-[18%] rounded-full shadow-md"
        style={{ top: '50%', left: '30%', background: `radial-gradient(circle at 30% 30%, #FF8A8F, ${airbnbRed})` }}
      />
      {/* White stones */}
      <div
        className="absolute w-[18%] h-[18%] rounded-full shadow-md"
        style={{ top: '30%', left: '10%', background: 'radial-gradient(circle at 30% 30%, #fff, #d0d0d0)' }}
      />
      <div
        className="absolute w-[18%] h-[18%] rounded-full shadow-md"
        style={{ top: '50%', left: '70%', background: 'radial-gradient(circle at 30% 30%, #fff, #d0d0d0)' }}
      />
      <div
        className="absolute w-[18%] h-[18%] rounded-full shadow-md"
        style={{ top: '70%', left: '50%', background: 'radial-gradient(circle at 30% 30%, #fff, #d0d0d0)' }}
      />
    </div>
  );
}

function BangBoardPreview() {
  // Pre-computed explosion starburst paths (static to avoid hydration mismatch)
  const outerPath = "M50,11.12L55.08,36.05L66.66,30.14L60.75,41.73L85.68,46.81L60.75,51.89L66.66,63.47L55.08,57.56L50,82.49L44.92,57.56L33.34,63.47L39.25,51.89L14.32,46.81L39.25,41.73L33.34,30.14L44.92,36.05Z";
  const middlePath = "M50,32.12L52.97,39.24L60.09,36.27L57.12,43.39L64.24,46.36L57.12,49.33L60.09,56.45L52.97,53.48L50,60.6L47.03,53.48L39.91,56.45L42.88,49.33L35.76,46.36L42.88,43.39L39.91,36.27L47.03,39.24Z";
  const innerPath = "M50,39.9L54.68,45.1L61.8,45.1L57.12,50L61.8,54.9L54.68,54.9L50,60.1L45.32,54.9L38.2,54.9L42.88,50L38.2,45.1L45.32,45.1Z";

  return (
    <div
      className="w-full h-full relative"
      style={{
        backgroundColor: '#3D3D3D',
        backgroundImage: `
          linear-gradient(#C4A363 1px, transparent 1px),
          linear-gradient(90deg, #C4A363 1px, transparent 1px)
        `,
        backgroundSize: '20% 20%',
        backgroundPosition: '10% 10%',
      }}
    >
      {/* Russian flag stones */}
      <div className="absolute w-[18%] h-[18%] rounded-full shadow-md overflow-hidden" style={{ top: '10%', left: '10%' }}>
        <div className="w-full h-full flex flex-col">
          <div className="flex-1" style={{ backgroundColor: '#FFFFFF' }} />
          <div className="flex-1" style={{ backgroundColor: '#0039A6' }} />
          <div className="flex-1" style={{ backgroundColor: '#D52B1E' }} />
        </div>
      </div>
      <div className="absolute w-[18%] h-[18%] rounded-full shadow-md overflow-hidden" style={{ top: '30%', left: '50%' }}>
        <div className="w-full h-full flex flex-col">
          <div className="flex-1" style={{ backgroundColor: '#FFFFFF' }} />
          <div className="flex-1" style={{ backgroundColor: '#0039A6' }} />
          <div className="flex-1" style={{ backgroundColor: '#D52B1E' }} />
        </div>
      </div>
      {/* Ukrainian flag stones */}
      <div className="absolute w-[18%] h-[18%] rounded-full shadow-md overflow-hidden" style={{ top: '10%', left: '50%' }}>
        <div className="w-full h-full flex flex-col">
          <div className="flex-1" style={{ backgroundColor: '#005BBB' }} />
          <div className="flex-1" style={{ backgroundColor: '#FFD500' }} />
        </div>
      </div>
      <div className="absolute w-[18%] h-[18%] rounded-full shadow-md overflow-hidden" style={{ top: '50%', left: '30%' }}>
        <div className="w-full h-full flex flex-col">
          <div className="flex-1" style={{ backgroundColor: '#005BBB' }} />
          <div className="flex-1" style={{ backgroundColor: '#FFD500' }} />
        </div>
      </div>
      {/* Explosion starburst SVG */}
      <svg
        className="absolute"
        style={{ top: '45%', left: '50%', width: '45%', height: '45%' }}
        viewBox="0 0 100 100"
      >
        {/* Outer red layer */}
        <path d={outerPath} fill="#D52B1E" />
        {/* Middle orange layer */}
        <path d={middlePath} fill="#FF8C00" />
        {/* Inner yellow center */}
        <path d={innerPath} fill="#FFD700" />
      </svg>
    </div>
  );
}

export default function AllGamesPage() {
  const router = useRouter();
  const [gameCount, setGameCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/games/count')
      .then(res => res.json())
      .then(data => setGameCount(data.count))
      .catch(() => {});
  }, []);

  const games = [
    {
      title: 'Online Go',
      subtitle: '2 Players · The Classic',
      href: '/classic',
      boardPreview: <ClassicBoardPreview />,
      bgGradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)',
      textColor: 'text-zinc-800',
    },
    {
      title: 'Wilde Go',
      subtitle: '2-8 Players · Everything is Possible',
      href: '/wilde',
      boardPreview: <WildeBoardPreview />,
      bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 50%, #4facfe 100%)',
    },
    {
      title: 'Crazy Go',
      subtitle: '4 Players · Not For Normal People',
      href: '/crazy',
      boardPreview: <CrazyBoardPreview />,
      bgGradient: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
      textColor: 'text-zinc-800',
    },
    {
      title: 'Zen Go',
      subtitle: '3 Players · Its All About The Moves',
      href: '/zen',
      boardPreview: <ZenBoardPreview />,
      bgGradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)',
    },
    {
      title: 'Domiio Go',
      subtitle: '2 Players · Branded',
      href: '/dom',
      boardPreview: <DomBoardPreview />,
      bgGradient: 'linear-gradient(135deg, #FF5A5F 0%, #FF385C 100%)',
    },
    {
      title: 'Go Bang',
      subtitle: '2 Players · Just War',
      href: '/bang',
      boardPreview: <BangBoardPreview />,
      bgGradient: 'linear-gradient(135deg, #4B5320 0%, #556B2F 50%, #5C4033 100%)',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            Goban Web
          </h1>
          <p className="text-xl text-zinc-400">
            Choose your Go adventure
          </p>
        </header>

        {/* Games Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {games.map((game) => (
            <GameCard
              key={game.href}
              title={game.title}
              subtitle={game.subtitle}
              href={game.href}
              boardPreview={game.boardPreview}
              bgGradient={game.bgGradient}
              textColor={game.textColor}
            />
          ))}
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center">
          <p className="text-zinc-500 text-sm">
            No login required. Free forever.{gameCount !== null && ` ${gameCount.toLocaleString()} games played.`}
          </p>
          <div className="mt-4 flex justify-center gap-6">
            <button
              onClick={() => router.push('/tutorial')}
              className="text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Free Tutorial
            </button>
            <button
              onClick={() => router.push('/legal/terms')}
              className="text-zinc-400 hover:text-white text-sm transition-colors"
            >
              Terms & Conditions
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
