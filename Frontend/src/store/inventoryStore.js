import { create } from "zustand";

export const useInventoryStore = create((set, get) => ({
  items: [
    {
      id: "INV-001",
      name: "Gloves (Latex)",
      category: "Consumable",
      stock: 120,
      minStock: 50,
      unit: "boxes",
      usedIn: ["Cleaning", "Extraction"],
    },
    {
      id: "INV-002",
      name: "Local Anesthetic",
      category: "Medicine",
      stock: 18,
      minStock: 20,
      unit: "vials",
      usedIn: ["Extraction", "Root Canal"],
    },
    {
      id: "INV-003",
      name: "Composite Filling",
      category: "Material",
      stock: 9,
      minStock: 10,
      unit: "tubes",
      usedIn: ["Filling"],
    },
  ],

  /* 📊 STATS */
  getStats: () => {
    const items = get().items;
    return {
      totalItems: items.length,
      lowStock: items.filter(i => i.stock <= i.minStock).length,
      outOfStock: items.filter(i => i.stock === 0).length,
    };
  },
}));