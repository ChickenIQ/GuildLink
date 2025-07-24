export const numberToHuman = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return (num / 1000).toFixed(1) + "K";
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1) + "M";

  return (num / 1_000_000_000).toFixed(1) + "B";
};
