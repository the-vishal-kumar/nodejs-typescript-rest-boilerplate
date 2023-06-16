export default class Money {
  static split = (amount: number, tenure: number): number[] => {
    const splitAmount = Math.floor((amount / tenure) * 100) / 100;
    let remainingAmount = Math.round((amount - splitAmount * tenure) * 100) / 100;
    const result: number[] = new Array(tenure).fill(splitAmount);

    let index = 0;
    while (remainingAmount > 0) {
      result[index] = Math.round((result[index] + 0.01) * 100) / 100;
      remainingAmount -= 0.01;
      index = (index + 1) % tenure;
    }

    return result.reverse();
  };

  static add = (a: number, b: number): number => parseFloat((a + b).toFixed(2));

  static subtract = (a: number, b: number): number => parseFloat((a - b).toFixed(2));
}
