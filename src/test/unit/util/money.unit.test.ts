import { Money } from '../../../util';

describe('Money', () => {
  describe('split', () => {
    it('should split the amount evenly among the tenure', () => {
      const amount = 100;
      const tenure = 5;
      const expected = [20, 20, 20, 20, 20];
      const result = Money.split(amount, tenure);
      expect(result).toEqual(expected);
    });

    it('should handle fractional amounts and distribute them evenly', () => {
      const amount = 99.99;
      const tenure = 3;
      const expected = [33.33, 33.33, 33.33];
      const result = Money.split(amount, tenure);
      expect(result).toEqual(expected);
    });

    it('should handle rounding errors and adjust the amounts accordingly', () => {
      const amount = 10;
      const tenure = 3;
      const expected = [3.33, 3.33, 3.34];
      const result = Money.split(amount, tenure);
      expect(result).toEqual(expected);
    });
  });

  describe('add', () => {
    it('should add two numbers and return the result rounded to 2 decimal places', () => {
      const a = 1.23;
      const b = 4.56;
      const expected = 5.79;
      const result = Money.add(a, b);
      expect(result).toEqual(expected);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers and return the result rounded to 2 decimal places', () => {
      const a = 5.67;
      const b = 2.34;
      const expected = 3.33;
      const result = Money.subtract(a, b);
      expect(result).toEqual(expected);
    });
  });
});
