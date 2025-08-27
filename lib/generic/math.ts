export const numberToHuman = (num: number): string => {
  if (num < 1000) return num.toString();
  if (num < 1_000_000) return (num / 1000).toFixed(1) + "K";
  if (num < 1_000_000_000) return (num / 1_000_000).toFixed(1) + "M";

  return (num / 1_000_000_000).toFixed(1) + "B";
};

export const formatTime = (miliseconds: number): string => {
  const timeSeconds = Math.floor(miliseconds / 1000);
  const minutes = Math.floor(timeSeconds / 60);
  const seconds = timeSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};
