import { currencyForCountry } from '../../../src/domain/currencyByCountry';

describe('currencyForCountry', () => {
  it('maps the 4 examples from the exercise statement', () => {
    expect(currencyForCountry('AR')).toBe('ARS');
    expect(currencyForCountry('BR')).toBe('BRL');
    expect(currencyForCountry('US')).toBe('USD');
    expect(currencyForCountry('EU')).toBe('EUR');
  });

  it('maps additional countries needed by the flight fixtures', () => {
    expect(currencyForCountry('CL')).toBe('CLP');
    expect(currencyForCountry('UY')).toBe('UYU');
    expect(currencyForCountry('MX')).toBe('MXN');
    expect(currencyForCountry('CO')).toBe('COP');
    expect(currencyForCountry('PE')).toBe('PEN');
    expect(currencyForCountry('GB')).toBe('GBP');
    expect(currencyForCountry('JP')).toBe('JPY');
  });

  it('maps eurozone countries to EUR', () => {
    expect(currencyForCountry('ES')).toBe('EUR');
    expect(currencyForCountry('FR')).toBe('EUR');
    expect(currencyForCountry('DE')).toBe('EUR');
    expect(currencyForCountry('IT')).toBe('EUR');
    expect(currencyForCountry('PT')).toBe('EUR');
    expect(currencyForCountry('NL')).toBe('EUR');
  });

  it('is case-insensitive', () => {
    expect(currencyForCountry('ar')).toBe('ARS');
    expect(currencyForCountry('Br')).toBe('BRL');
  });

  it('returns null for an unknown country', () => {
    expect(currencyForCountry('ZZ')).toBeNull();
  });
});
