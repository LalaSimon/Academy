-- Material.isPublic usunięte: pole istniało od Fazy 1, ale nic w UI nie
-- pozwalało go ustawić, więc żaden materiał nigdy nie był publiczny.
-- Kontrola dostępu opiera się teraz wyłącznie na powiązaniu z grupą/zajęciami
-- oraz na tym, kto materiał wgrał.
ALTER TABLE "Material" DROP COLUMN "isPublic";
