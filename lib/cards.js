const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['♠', '♥', '♦', '♣'];

export const HAND_SIZE = 4;
export const DEAL_ORDER = ['p1', 'p2', 'p3', 'p4'];

// Builds a standard 52-card deck.
export function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ id: `${rank}${suit}`, rank, suit })));
}

// Fisher–Yates shuffle (returns the same array instance shuffled).
export function shuffleInPlace(cards) {
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

// Returns base (unscaled) card width/height by size + orientation.
// We keep this centralized so changing card sizing is one edit.
export function getCardDimensions(size, orientation) {
  const bySize = {
    small: orientation === 'vertical' ? { w: 48, h: 64 } : { w: 64, h: 48 },
    medium: orientation === 'vertical' ? { w: 64, h: 96 } : { w: 96, h: 64 },
    large: orientation === 'vertical' ? { w: 80, h: 112 } : { w: 112, h: 80 },
  };
  return bySize[size];
}
