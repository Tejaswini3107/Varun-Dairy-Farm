export function fmt(amount: number): string {
  return `₹${Math.abs(amount).toLocaleString("en-IN")}`;
}
