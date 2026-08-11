import { EmailRateLimitService } from '../email-rate-limit.service';

describe('EmailRateLimitService', () => {
  let service: EmailRateLimitService;

  beforeEach(() => {
    service = new EmailRateLimitService();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('przepuszcza pierwsze 5 wysyłek na adres, szóstą odrzuca', () => {
    for (let i = 0; i < 5; i++) {
      expect(service.consume('ofiara@example.com')).toBe(true);
    }
    expect(service.consume('ofiara@example.com')).toBe(false);
  });

  it('liczy per adres — wyczerpanie jednego nie blokuje innego', () => {
    // To jest sedno zmiany: warstwa `mail` w throttlerze kubełkuje po IP, więc
    // atakujący zmieniający adres źródłowy obchodził ją bez wysiłku. Licznik
    // per odbiorca ma być ślepy na źródło żądania.
    for (let i = 0; i < 5; i++) service.consume('ofiara@example.com');

    expect(service.consume('ofiara@example.com')).toBe(false);
    expect(service.consume('ktos.inny@example.com')).toBe(true);
  });

  it('normalizuje adres — wielkość liter i spacje nie tworzą nowego kubełka', () => {
    for (let i = 0; i < 5; i++) service.consume('ofiara@example.com');

    // Bez normalizacji `Ofiara@…` byłoby osobnym kubełkiem i limit dałoby się
    // pomnożyć przez liczbę wariantów zapisu tego samego adresu.
    expect(service.consume('  OFIARA@Example.COM  ')).toBe(false);
  });

  it('zwalnia limit po upływie okna', () => {
    for (let i = 0; i < 5; i++) service.consume('user@example.com');
    expect(service.consume('user@example.com')).toBe(false);

    jest.advanceTimersByTime(60 * 60 * 1000 + 1);

    expect(service.consume('user@example.com')).toBe(true);
  });

  it('nie rośnie w nieskończoność — wygasłe wpisy są sprzątane', () => {
    // Mapa w pamięci procesu sama byłaby wektorem wyczerpania pamięci, gdyby
    // rosła z każdym nowym adresem. Sprzątanie odpala się przy zapisie.
    for (let i = 0; i < 1500; i++) service.consume(`user${i}@example.com`);

    const size = () =>
      (service as unknown as { hits: Map<string, number[]> }).hits.size;
    expect(size()).toBe(1500);

    jest.advanceTimersByTime(60 * 60 * 1000 + 1);
    service.consume('kolejny@example.com');

    // Po przekroczeniu okna wszystkie stare wpisy znikają; zostaje ten nowy.
    expect(size()).toBe(1);
  });
});
