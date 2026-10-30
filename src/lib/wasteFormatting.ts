export const formatWasteUnit = (quantity: number, unit?: string | null) => {
  const normalizedUnit = unit || "pcs";

  if (Math.abs(quantity) === 1) return normalizedUnit;
  if (normalizedUnit === "bin") return "bins";
  if (normalizedUnit === "truck load") return "truck loads";

  return normalizedUnit;
};

export const formatWasteQuantity = (quantity: number, unit?: string | null) =>
  `${quantity} ${formatWasteUnit(quantity, unit)}`;
