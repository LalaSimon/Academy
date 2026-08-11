-- Blokada konta po serii nieudanych logowań (audyt 2026-08-11).
-- Limit żądań per IP nie chroni przed zgadywaniem hasła rozłożonym po wielu
-- adresach; licznik per konto tak.
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);

-- Od tej wersji w bazie leżą SKRÓTY tokenów, nie tokeny.
-- Kolumny zostają tekstowe, ale zapisane w nich wartości sprzed migracji nie
-- pasują już do niczego — wymuszamy ponowne logowanie i ponowny reset hasła.
-- Kasujemy je zamiast zostawiać, bo martwy wiersz z JAWNYM tokenem to dokładnie
-- to ryzyko, które ta zmiana likwiduje.
DELETE FROM "RefreshToken";
UPDATE "User" SET "passwordResetToken" = NULL, "passwordResetExpiry" = NULL;
