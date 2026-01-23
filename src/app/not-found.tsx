'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 100 quotes about virtue, patience, and wisdom from Japanese and Chinese philosophy
const quotes = [
  { text: "The journey of a thousand miles begins with a single step.", origin: "Lao Tzu" },
  { text: "Patience is the companion of wisdom.", origin: "Saint Augustine" },
  { text: "Fall seven times, stand up eight.", origin: "Japanese Proverb" },
  { text: "The bamboo that bends is stronger than the oak that resists.", origin: "Japanese Proverb" },
  { text: "A gem cannot be polished without friction, nor a man perfected without trials.", origin: "Confucius" },
  { text: "In the midst of chaos, there is also opportunity.", origin: "Sun Tzu" },
  { text: "He who knows others is wise; he who knows himself is enlightened.", origin: "Lao Tzu" },
  { text: "The greatest glory is not in never falling, but in rising every time we fall.", origin: "Confucius" },
  { text: "Nature does not hurry, yet everything is accomplished.", origin: "Lao Tzu" },
  { text: "Better a diamond with a flaw than a pebble without.", origin: "Confucius" },
  { text: "Vision without action is a daydream. Action without vision is a nightmare.", origin: "Japanese Proverb" },
  { text: "An inch of time is an inch of gold, but an inch of gold cannot buy an inch of time.", origin: "Chinese Proverb" },
  { text: "The frog in the well knows nothing of the great ocean.", origin: "Japanese Proverb" },
  { text: "A single conversation with a wise man is worth a month's study of books.", origin: "Chinese Proverb" },
  { text: "Be not afraid of going slowly, be afraid only of standing still.", origin: "Chinese Proverb" },
  { text: "The reverse side also has a reverse side.", origin: "Japanese Proverb" },
  { text: "Teachers open the door, but you must enter by yourself.", origin: "Chinese Proverb" },
  { text: "A book holds a house of gold.", origin: "Chinese Proverb" },
  { text: "One kind word can warm three winter months.", origin: "Japanese Proverb" },
  { text: "Even monkeys fall from trees.", origin: "Japanese Proverb" },
  { text: "The nail that sticks out gets hammered down.", origin: "Japanese Proverb" },
  { text: "Flowing water never goes stale.", origin: "Chinese Proverb" },
  { text: "If you want happiness for an hour, take a nap. If you want happiness for a lifetime, help someone.", origin: "Chinese Proverb" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", origin: "Chinese Proverb" },
  { text: "Silence is a true friend who never betrays.", origin: "Confucius" },
  { text: "A clever person turns great troubles into little ones, and little ones into none at all.", origin: "Chinese Proverb" },
  { text: "Do not confine your children to your own learning, for they were born in another time.", origin: "Chinese Proverb" },
  { text: "Learning is a treasure that will follow its owner everywhere.", origin: "Chinese Proverb" },
  { text: "Wheresoever you go, go with all your heart.", origin: "Confucius" },
  { text: "The beginning of wisdom is to call things by their proper name.", origin: "Confucius" },
  { text: "Life is really simple, but we insist on making it complicated.", origin: "Confucius" },
  { text: "To see what is right and not do it is the want of courage.", origin: "Confucius" },
  { text: "Everything has beauty, but not everyone sees it.", origin: "Confucius" },
  { text: "Real knowledge is to know the extent of one's ignorance.", origin: "Confucius" },
  { text: "What you do not want done to yourself, do not do to others.", origin: "Confucius" },
  { text: "It does not matter how slowly you go as long as you do not stop.", origin: "Confucius" },
  { text: "The man who moves a mountain begins by carrying away small stones.", origin: "Confucius" },
  { text: "When anger rises, think of the consequences.", origin: "Confucius" },
  { text: "Attack the evil that is within yourself, rather than attacking the evil that is in others.", origin: "Confucius" },
  { text: "Before you embark on a journey of revenge, dig two graves.", origin: "Confucius" },
  { text: "Knowing what you know and knowing what you don't know is true knowledge.", origin: "Confucius" },
  { text: "The way out is through the door. Why is it that no one will use this method?", origin: "Confucius" },
  { text: "A lion chased me up a tree, and I greatly enjoyed the view from the top.", origin: "Confucius" },
  { text: "To be wronged is nothing, unless you continue to remember it.", origin: "Confucius" },
  { text: "He who speaks without modesty will find it difficult to make his words good.", origin: "Confucius" },
  { text: "The superior man is modest in his speech but exceeds in his actions.", origin: "Confucius" },
  { text: "When you see a worthy person, endeavor to emulate him.", origin: "Confucius" },
  { text: "Give a bowl of rice to a man and you will feed him for a day.", origin: "Confucius" },
  { text: "He who learns but does not think is lost.", origin: "Confucius" },
  { text: "Choose a job you love, and you will never have to work a day in your life.", origin: "Confucius" },
  { text: "The water that carries the boat is the same that capsizes it.", origin: "Chinese Proverb" },
  { text: "A bird does not sing because it has an answer. It sings because it has a song.", origin: "Chinese Proverb" },
  { text: "Distant water won't help to put out a fire close at hand.", origin: "Chinese Proverb" },
  { text: "A smile will gain you ten more years of life.", origin: "Chinese Proverb" },
  { text: "Talk does not cook rice.", origin: "Chinese Proverb" },
  { text: "He who asks is a fool for five minutes, he who does not ask remains a fool forever.", origin: "Chinese Proverb" },
  { text: "A closed mind is like a closed book; just a block of wood.", origin: "Chinese Proverb" },
  { text: "Dig the well before you are thirsty.", origin: "Chinese Proverb" },
  { text: "Experience is a comb which nature gives us when we are bald.", origin: "Chinese Proverb" },
  { text: "Govern a family as you would cook a small fish - very gently.", origin: "Chinese Proverb" },
  { text: "A wise man makes his own decisions, an ignorant man follows public opinion.", origin: "Chinese Proverb" },
  { text: "With true friends, even water drunk together is sweet enough.", origin: "Chinese Proverb" },
  { text: "To understand your parents' love, you must raise children yourself.", origin: "Chinese Proverb" },
  { text: "One cannot refuse to eat just because there is a chance of being choked.", origin: "Chinese Proverb" },
  { text: "A fall into a ditch makes you wiser.", origin: "Chinese Proverb" },
  { text: "When the winds of change blow, some people build walls and others build windmills.", origin: "Chinese Proverb" },
  { text: "Better to light a candle than to curse the darkness.", origin: "Chinese Proverb" },
  { text: "If you bow at all, bow low.", origin: "Chinese Proverb" },
  { text: "Virtue is not left to stand alone.", origin: "Confucius" },
  { text: "Those who know do not speak. Those who speak do not know.", origin: "Lao Tzu" },
  { text: "A good traveler has no fixed plans and is not intent on arriving.", origin: "Lao Tzu" },
  { text: "When I let go of what I am, I become what I might be.", origin: "Lao Tzu" },
  { text: "Mastering others is strength. Mastering yourself is true power.", origin: "Lao Tzu" },
  { text: "The truth is not always beautiful, nor beautiful words the truth.", origin: "Lao Tzu" },
  { text: "To the mind that is still, the whole universe surrenders.", origin: "Lao Tzu" },
  { text: "If you do not change direction, you may end up where you are heading.", origin: "Lao Tzu" },
  { text: "Simplicity, patience, compassion. These three are your greatest treasures.", origin: "Lao Tzu" },
  { text: "Care about what other people think and you will always be their prisoner.", origin: "Lao Tzu" },
  { text: "New beginnings are often disguised as painful endings.", origin: "Lao Tzu" },
  { text: "Life and death are one thread, the same line viewed from different sides.", origin: "Lao Tzu" },
  { text: "Great acts are made up of small deeds.", origin: "Lao Tzu" },
  { text: "He who conquers others is strong; he who conquers himself is mighty.", origin: "Lao Tzu" },
  { text: "Knowing others is intelligence; knowing yourself is true wisdom.", origin: "Lao Tzu" },
  { text: "Stop thinking, and end your problems.", origin: "Lao Tzu" },
  { text: "When you are content to be simply yourself, you become what you are.", origin: "Lao Tzu" },
  { text: "Do the difficult things while they are easy.", origin: "Lao Tzu" },
  { text: "Act without expectation.", origin: "Lao Tzu" },
  { text: "At the center of your being you have the answer.", origin: "Lao Tzu" },
  { text: "If you realize that all things change, there is nothing you will try to hold on to.", origin: "Lao Tzu" },
  { text: "The flame that burns twice as bright burns half as long.", origin: "Lao Tzu" },
  { text: "Respond intelligently even to unintelligent treatment.", origin: "Lao Tzu" },
  { text: "The wise man is one who knows what he does not know.", origin: "Lao Tzu" },
  { text: "He who knows that enough is enough will always have enough.", origin: "Lao Tzu" },
  { text: "Manifest plainness, embrace simplicity, reduce selfishness, have few desires.", origin: "Lao Tzu" },
  { text: "Give evil nothing to oppose and it will disappear by itself.", origin: "Lao Tzu" },
  { text: "The softest things in the world overcome the hardest things.", origin: "Lao Tzu" },
  { text: "Muddy water, let stand, becomes clear.", origin: "Lao Tzu" },
  { text: "An ant on the move does more than a dozing ox.", origin: "Lao Tzu" },
  { text: "Loss is not as bad as wanting more.", origin: "Lao Tzu" },
];

export default function NotFound() {
  const router = useRouter();
  const [quote, setQuote] = useState(quotes[0]);

  useEffect(() => {
    // Pick a random quote on mount
    const randomIndex = Math.floor(Math.random() * quotes.length);
    setQuote(quotes[randomIndex]);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-8">
      {/* Stones decoration */}
      <div className="flex gap-6 mb-12">
        {/* Black stone */}
        <div
          className="w-20 h-20 rounded-full shadow-2xl"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #4a4a4a 0%, #1a1a1a 100%)',
            boxShadow: '4px 6px 12px rgba(0,0,0,0.5)',
          }}
        />
        {/* White stone */}
        <div
          className="w-20 h-20 rounded-full shadow-2xl"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #ffffff 0%, #c0c0c0 100%)',
            boxShadow: '4px 6px 12px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      {/* 404 */}
      <h1 className="text-8xl font-bold text-white mb-4">404</h1>
      <p className="text-xl text-zinc-400 mb-12">This path does not exist</p>

      {/* Quote */}
      <div className="max-w-xl text-center mb-12">
        <blockquote className="text-2xl text-zinc-300 italic mb-4">
          &ldquo;{quote.text}&rdquo;
        </blockquote>
        <cite className="text-zinc-500">— {quote.origin}</cite>
      </div>

      {/* Back button */}
      <button
        onClick={() => router.push('/')}
        className="px-8 py-3 bg-white text-zinc-900 rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
      >
        Return Home
      </button>

      {/* Decorative grid pattern */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(white 1px, transparent 1px),
            linear-gradient(90deg, white 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}
