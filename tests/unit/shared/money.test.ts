import { round2 } from '../../../src/shared/money';

describe('round2', () => {
  it('rounds a value that is already exact', () => {
    expect(round2(100)).toBe(100);
    expect(round2(231.4)).toBe(231.4);
  });

  it('rounds 159.375 to 159.38 despite float imprecision', () => {
    expect(round2(159.375)).toBe(159.38);
  });

  it('rounds 2.675 to 2.68 despite float imprecision', () => {
    expect(round2(2.675)).toBe(2.68);
  });

  it('rounds down when the third decimal is below 5', () => {
    expect(round2(20.401)).toBe(20.4);
  });

  it('rounds a value with many decimals', () => {
    expect(round2(3022.7600000001)).toBe(3022.76);
  });

  it('rounds zero', () => {
    expect(round2(0)).toBe(0);
  });
});
