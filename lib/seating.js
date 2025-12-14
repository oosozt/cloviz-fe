// Table seating mapping for this specific UI layout.
//
// We intentionally use abstract keys `p1..p4` everywhere in code.
// The labels on screen ("PLAYER 2", "PLAYER 3"...) are derived from
// PLAYER_NUM_BY_KEY so we can keep the clockwise order consistent even though
// the visual seats are not laid out as p1,p2,p3,p4 around the table.
//
// Visual seating:
// - p1: bottom (Player 1)
// - p3: left   (Player 2)
// - p2: top    (Player 3)
// - p4: right  (Player 4)

// Clockwise order matching the table drawing: bottom -> left -> top -> right.
export const TURN_ORDER = ['p1', 'p3', 'p2', 'p4'];

// Used for UI labels like "P2 RESPOND".
export const PLAYER_NUM_BY_KEY = { p1: 1, p2: 3, p3: 2, p4: 4 };
