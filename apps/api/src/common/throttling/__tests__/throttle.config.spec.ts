import type { ExecutionContext } from '@nestjs/common';
import { THROTTLE_LIMITS, throttlerTiers } from '../throttle.config';

/**
 * Warstwy limitów są konfiguracją, ale konfiguracją, której pomyłka jest cicha:
 * źle dobrany tracker nie wywala testów ani nie loguje niczego — po prostu
 * kubełkuje nie to, co trzeba. Stąd testy na samych funkcjach.
 */
describe('throttle.config', () => {
  const tier = (name: string) => {
    const found = throttlerTiers.find((t) => t.name === name);
    if (!found) throw new Error(`Brak warstwy ${name}`);
    return found;
  };

  const req = (over: Record<string, unknown> = {}) => ({
    ip: '10.0.0.1',
    headers: {},
    socket: { remoteAddress: '10.0.0.1' },
    ...over,
  });

  describe('warstwa default — tracker po tożsamości', () => {
    const track = (r: Record<string, unknown>) =>
      tier('default').getTracker!(r, {} as ExecutionContext);

    it('rozróżnia dwóch użytkowników z tego samego IP', async () => {
      // Szkoła językowa siedzi za jednym NAT-em. Kubełkowanie po IP oznaczałoby,
      // że jeden uczeń w pętli odcina dostęp całej klasie.
      const a = await track(
        req({ headers: { authorization: 'Bearer token-ucznia-A' } }),
      );
      const b = await track(
        req({ headers: { authorization: 'Bearer token-ucznia-B' } }),
      );

      expect(a).not.toBe(b);
    });

    it('daje ten sam kubełek dla kolejnych żądań tego samego tokenu', async () => {
      const headers = { authorization: 'Bearer stały-token' };
      expect(await track(req({ headers }))).toBe(await track(req({ headers })));
    });

    it('nie umieszcza tokenu w kluczu — tylko jego skrót', async () => {
      const result = await track(
        req({ headers: { authorization: 'Bearer sekretny-token' } }),
      );
      // Klucz trafia do storage i logów, więc nie może zawierać poświadczenia.
      expect(result).not.toContain('sekretny-token');
      expect(result).toMatch(/^t:[a-f0-9]{32}$/);
    });

    it('bez tokenu wraca do adresu IP', async () => {
      expect(await track(req())).toBe('ip:10.0.0.1');
    });

    it('gdy brak req.ip, korzysta z adresu gniazda', async () => {
      expect(
        await track(
          req({ ip: undefined, socket: { remoteAddress: '10.9.9.9' } }),
        ),
      ).toBe('ip:10.9.9.9');
    });
  });

  describe('warstwa ip — sufit na cały serwis', () => {
    it('kluczuje BEZ nazwy trasy, więc jest jednym budżetem dla wszystkich tras', () => {
      // Domyślny `generateKey` biblioteki wplata nazwę kontrolera i handlera,
      // czyli daje osobny budżet per trasa — atakujący skaczący po 50 endpointach
      // dostawałby 50×limit. Sufit ma być jeden.
      const generateKey = tier('ip').generateKey!;
      const ctx = {} as ExecutionContext;

      expect(generateKey(ctx, 'ip:1.2.3.4', 'ip')).toBe(
        generateKey(ctx, 'ip:1.2.3.4', 'ip'),
      );
      expect(generateKey(ctx, 'ip:1.2.3.4', 'ip')).not.toContain('Controller');
    });

    it('zawsze kubełkuje po IP, nawet gdy żądanie ma token', async () => {
      const tracked = await tier('ip').getTracker!(
        req({ headers: { authorization: 'Bearer x' } }),
        {} as ExecutionContext,
      );
      // Sufit musi być odporny na podrabianie tokenów — inaczej powódź żądań
      // z losowymi tokenami omijałaby go, tworząc nowy kubełek za każdym razem.
      expect(tracked).toBe('ip:10.0.0.1');
    });
  });

  describe('limity', () => {
    it('operacje drogie są ostrzejsze niż warstwa domyślna', () => {
      expect(THROTTLE_LIMITS.mail).toBeLessThan(THROTTLE_LIMITS.default);
      expect(THROTTLE_LIMITS.auth).toBeLessThan(THROTTLE_LIMITS.default);
      expect(THROTTLE_LIMITS.upload).toBeLessThan(THROTTLE_LIMITS.default);
      expect(THROTTLE_LIMITS.report).toBeLessThan(THROTTLE_LIMITS.default);
      expect(THROTTLE_LIMITS.checkout).toBeLessThan(THROTTLE_LIMITS.default);
    });

    it('sufit IP jest luźniejszy niż warstwa per tożsamość', () => {
      // Inaczej sufit zadziałałby pierwszy i warstwa robocza nie miałaby znaczenia.
      expect(THROTTLE_LIMITS.ip).toBeGreaterThan(THROTTLE_LIMITS.default);
    });
  });
});
