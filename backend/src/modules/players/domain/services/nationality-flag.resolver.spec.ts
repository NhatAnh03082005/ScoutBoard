import {
  resolveNationalityFlagUrl,
  getCountryIsoCode,
} from './nationality-flag.resolver';

describe('NationalityFlagResolver', () => {
  describe('Known Nationalities', () => {
    it('should resolve standard ISO countries', () => {
      expect(getCountryIsoCode('France')).toBe('fr');
      expect(resolveNationalityFlagUrl('France')).toBe(
        'https://flagcdn.com/w40/fr.png',
      );

      expect(getCountryIsoCode('Spain')).toBe('es');
      expect(resolveNationalityFlagUrl('Spain')).toBe(
        'https://flagcdn.com/w40/es.png',
      );

      expect(getCountryIsoCode('Morocco')).toBe('ma');
      expect(resolveNationalityFlagUrl('Morocco')).toBe(
        'https://flagcdn.com/w40/ma.png',
      );

      expect(getCountryIsoCode('Brazil')).toBe('br');
      expect(resolveNationalityFlagUrl('Brazil')).toBe(
        'https://flagcdn.com/w40/br.png',
      );
    });

    it('should resolve UK home football nations with ISO 3166-2 subdivisions', () => {
      expect(getCountryIsoCode('England')).toBe('gb-eng');
      expect(resolveNationalityFlagUrl('England')).toBe(
        'https://flagcdn.com/w40/gb-eng.png',
      );

      expect(getCountryIsoCode('Scotland')).toBe('gb-sct');
      expect(resolveNationalityFlagUrl('Scotland')).toBe(
        'https://flagcdn.com/w40/gb-sct.png',
      );

      expect(getCountryIsoCode('Wales')).toBe('gb-wls');
      expect(resolveNationalityFlagUrl('Wales')).toBe(
        'https://flagcdn.com/w40/gb-wls.png',
      );

      expect(getCountryIsoCode('Northern Ireland')).toBe('gb-nir');
      expect(resolveNationalityFlagUrl('Northern Ireland')).toBe(
        'https://flagcdn.com/w40/gb-nir.png',
      );
    });
  });

  describe('Aliases and Diacritics', () => {
    it("should handle Ivory Coast and Côte d'Ivoire", () => {
      expect(getCountryIsoCode("Côte d'Ivoire")).toBe('ci');
      expect(getCountryIsoCode('Ivory Coast')).toBe('ci');
      expect(getCountryIsoCode("Cote d'Ivoire")).toBe('ci');
    });

    it('should handle Korea Republic and South Korea', () => {
      expect(getCountryIsoCode('Korea Republic')).toBe('kr');
      expect(getCountryIsoCode('South Korea')).toBe('kr');
      expect(getCountryIsoCode('Korea, Republic of')).toBe('kr');
    });

    it('should handle Türkiye and Turkey', () => {
      expect(getCountryIsoCode('Türkiye')).toBe('tr');
      expect(getCountryIsoCode('Turkey')).toBe('tr');
    });

    it('should handle USA and United States', () => {
      expect(getCountryIsoCode('USA')).toBe('us');
      expect(getCountryIsoCode('United States')).toBe('us');
      expect(getCountryIsoCode('United States of America')).toBe('us');
    });

    it('should handle DR Congo variants', () => {
      expect(getCountryIsoCode('Congo DR')).toBe('cd');
      expect(getCountryIsoCode('DR Congo')).toBe('cd');
      expect(getCountryIsoCode('Democratic Republic of the Congo')).toBe('cd');
    });

    it('should handle Ireland and Republic of Ireland', () => {
      expect(getCountryIsoCode('Republic of Ireland')).toBe('ie');
      expect(getCountryIsoCode('Ireland')).toBe('ie');
    });
  });

  describe('Formatting Resilience', () => {
    it('should handle leading/trailing whitespace and mixed case', () => {
      expect(getCountryIsoCode('  eNgLaNd  ')).toBe('gb-eng');
      expect(resolveNationalityFlagUrl('  eNgLaNd  ')).toBe(
        'https://flagcdn.com/w40/gb-eng.png',
      );
      expect(getCountryIsoCode('bRaZiL')).toBe('br');
    });
  });

  describe('Unknown and Null Handling', () => {
    it('should return null safely for unknown nationalities without crashing', () => {
      expect(getCountryIsoCode('Atlantis')).toBeNull();
      expect(resolveNationalityFlagUrl('Atlantis')).toBeNull();

      expect(getCountryIsoCode('UnknownCountry123')).toBeNull();
      expect(resolveNationalityFlagUrl('UnknownCountry123')).toBeNull();
    });

    it('should return null safely for null, undefined, or empty string', () => {
      expect(getCountryIsoCode(null)).toBeNull();
      expect(resolveNationalityFlagUrl(null)).toBeNull();

      expect(getCountryIsoCode(undefined)).toBeNull();
      expect(resolveNationalityFlagUrl(undefined)).toBeNull();

      expect(getCountryIsoCode('')).toBeNull();
      expect(resolveNationalityFlagUrl('')).toBeNull();

      expect(getCountryIsoCode('   ')).toBeNull();
      expect(resolveNationalityFlagUrl('   ')).toBeNull();
    });
  });
});
