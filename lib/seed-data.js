// Canonical seed data for WapiLeo places.
// Used by `prisma/seed.js`. The front-end keeps its own trimmed copy as an
// offline fallback (see FALLBACK_PLACES in app.js).

export const PLACES = [
  {
    id: "coral",
    name: "Coral Beach",
    area: "Masaki",
    price: "40k - 100k",
    line: "Ocean air, cocktails, and date-night photos that do the talking.",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
    baseScore: 91,
    baseState: "Moto sana",
    categories: ["all", "date", "chill", "beach", "food"],
    tags: ["Great photos", "Date friendly", "Beach breeze"],
  },
  {
    id: "samaki",
    name: "Samaki Samaki",
    area: "Mlimani City",
    price: "40k - 100k",
    line: "Dinner, live music, and the table next to you probably knows the DJ.",
    image:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1200&q=80",
    baseScore: 87,
    baseState: "Kuna vibe",
    categories: ["all", "music", "food", "date"],
    tags: ["Live band", "Dinner", "Inajaa mapema"],
  },
  {
    id: "warehouse",
    name: "Warehouse",
    area: "Masaki",
    price: "100k+",
    line: "Late night, loud fits, Afrobeats, Amapiano, and zero sitting still.",
    image:
      "https://images.unsplash.com/photo-1571266028243-d220c6a7edbf?auto=format&fit=crop&w=1200&q=80",
    baseScore: 95,
    baseState: "Imeamka",
    categories: ["all", "music"],
    tags: ["Amapiano", "Dress smart", "Late night"],
  },
  {
    id: "escape",
    name: "Escape One",
    area: "Mikocheni",
    price: "Under 40k",
    line: "Games, light food, and an easy hangout when nobody wants pressure.",
    image:
      "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=1200&q=80",
    baseScore: 78,
    baseState: "Inajaa",
    categories: ["all", "games", "chill", "date"],
    tags: ["Games", "Low pressure", "Group plan"],
  },
  {
    id: "slipway",
    name: "The Slipway",
    area: "Msasani",
    price: "40k - 100k",
    line: "Sunset walk, dessert, calm talk, and a view that fixes the plan.",
    image:
      "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1200&q=80",
    baseScore: 83,
    baseState: "Chill tu",
    categories: ["all", "date", "chill", "beach", "food"],
    tags: ["Sunset", "Quiet-ish", "Walkable"],
  },
  {
    id: "nyama",
    name: "Moyo Nyama",
    area: "Sinza",
    price: "Under 40k",
    line: "Nyama, football noise, and the kind of plan that becomes a story.",
    image:
      "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    baseScore: 76,
    baseState: "Kuna watu",
    categories: ["all", "food", "chill"],
    tags: ["Budget friendly", "Football", "Nyama choma"],
  },
];
