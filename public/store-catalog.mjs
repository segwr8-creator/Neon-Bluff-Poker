// Keys are TOTAL Stack Dollars credited, including each advertised bonus.
export const neonBluffStore = {
  "500":    { label: "500 Stack Dollars", price: "$0.99", productId: "chips_500" },
  "2500":   { label: "2,000 Stack Dollars (+500 Bonus!)", price: "$2.99", productId: "chips_2000" },
  "6000":   { label: "5,000 Stack Dollars (+1,000 Bonus!)", price: "$4.99", productId: "chips_5000" },
  "15000":  { label: "10,000 Stack Dollars (+5,000 Mega Bonus!)", price: "$9.99", productId: "chips_10000" },
  "35000":  { label: "20,000 Stack Dollars (+15,000 Hyper Bonus!)", price: "$19.99", productId: "chips_20000" },
  "60000":  { label: "30,000 Stack Dollars (Double Chip Pack!)", price: "$29.99", productId: "chips_30000" },
  "120000": { label: "50,000 Stack Dollars (High Roller VIP Jackpot!)", price: "$49.99", productId: "high_roller_pack" }
};

export const STORE_PACKS = Object.entries(neonBluffStore).map(([total, pack]) => ({
  id: pack.productId,
  selectionValue: total,
  amount: Number(total) * 100, // Server accounting uses integer SD cents.
  label: pack.label,
  plannedPrice: pack.price + ' USD'
}));
