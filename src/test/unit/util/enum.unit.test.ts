import { Enum } from '../../../util';

const Colors = Enum({
  Red: 'red',
  Green: 'green',
  Blue: 'blue',
}) as Readonly<{ Red: string; Green: string; Blue: string }>;

describe('Enum', () => {
  it('should return the correct value for a valid enum key', () => {
    expect(Colors.Red).toBe('red');
    expect(Colors.Green).toBe('green');
    expect(Colors.Blue).toBe('blue');
  });

  it('should throw an error for an invalid enum key', () => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => Colors.Yellow).toThrow('"Yellow" value does not exist in the enum');
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect(() => Colors.Orange).toThrow('"Orange" value does not exist in the enum');
  });

  it('should throw an error when attempting to add a new value', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Colors.Yellow = 'yellow';
    }).toThrow('Cannot modify or add a new value to the enum');
  });

  it('should not allow modification of existing values', () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Colors.Red = 'newRed';
    }).toThrow('Cannot modify or add a new value to the enum');
  });
});
