import {
  ALLOWED_MIME_REGEX,
  isAllowedMime,
  safeExtension,
} from '../upload.constraints';

describe('upload.constraints', () => {
  describe('allowlista typów', () => {
    it('przepuszcza formaty potrzebne szkole', () => {
      for (const mime of [
        'application/pdf',
        'image/png',
        'audio/mpeg',
        'video/mp4',
        'text/csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]) {
        expect(isAllowedMime(mime)).toBe(true);
        expect(ALLOWED_MIME_REGEX.test(mime)).toBe(true);
      }
    });

    it('odrzuca formaty wykonywane przez przeglądarkę', () => {
      // SVG jest tu najważniejszy: wygląda jak obrazek, a jest dokumentem,
      // który przeglądarka wykonuje razem z osadzonym <script>.
      for (const mime of [
        'text/html',
        'image/svg+xml',
        'application/xhtml+xml',
        'application/javascript',
        'text/xml',
      ]) {
        expect(isAllowedMime(mime)).toBe(false);
        expect(ALLOWED_MIME_REGEX.test(mime)).toBe(false);
      }
    });

    it('regex jest zakotwiczony — nie da się go obejść doklejaniem', () => {
      // Bez ^ i $ „text/html;application/pdf" przeszłoby jako częściowe trafienie.
      expect(ALLOWED_MIME_REGEX.test('text/html;application/pdf')).toBe(false);
      expect(ALLOWED_MIME_REGEX.test('application/pdf-evil')).toBe(false);
      expect(ALLOWED_MIME_REGEX.test('evil/application/pdf')).toBe(false);
    });
  });

  describe('safeExtension', () => {
    it('bierze rozszerzenie z typu MIME, nie z nazwy pliku', () => {
      // `originalname` pochodzi od klienta. Poprzednie `split('.').pop()`
      // przepuszczało do klucza w MinIO dokładnie to, co przysłał wgrywający.
      expect(safeExtension('application/pdf', 'raport.pdf.html')).toBe('pdf');
      expect(safeExtension('image/png', 'obrazek.svg')).toBe('png');
    });

    it('neutralizuje próby przejścia po katalogach w nazwie', () => {
      expect(safeExtension('application/pdf', '../../etc/passwd')).toBe('pdf');
      expect(safeExtension('image/jpeg', '../../../a.jpg')).toBe('jpg');
    });

    it('dla nieznanego typu zwraca bin', () => {
      expect(safeExtension('text/html', 'strona.html')).toBe('bin');
    });

    it('nie gubi rozszerzenia dla typów o dwóch nazwach', () => {
      expect(safeExtension('audio/x-wav', 'nagranie.wav')).toBe('wav');
      expect(safeExtension('application/x-zip-compressed', 'paczka.zip')).toBe(
        'zip',
      );
    });
  });
});
