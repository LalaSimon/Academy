import { Workbook, Worksheet } from 'exceljs';

/**
 * Wspólny builder arkuszy raportów — jeden spójny styl dla wszystkich
 * raportów admina (płatności, frekwencja, uczniowie).
 *
 * Układ arkusza:
 *   wiersz 1  → "Academy — <tytuł>"        (duży, pogrubiony)
 *   wiersz 2  → podsumowanie filtrów         (kursywa, szary)
 *   wiersz 3  → "Wygenerowano: <data>"       (mały, szary)
 *   wiersz 4  → pusty
 *   wiersz 5  → nagłówek tabeli              (biały na fioletowym, zamrożony)
 *   wiersz 6+ → dane, a na końcu wiersze podsumowania (pogrubione)
 */

export type ColumnType =
  | 'text'
  | 'currency'
  | 'number'
  | 'percent'
  | 'date'
  | 'datetime';

export interface ReportColumn {
  header: string;
  key: string;
  type?: ColumnType;
  width?: number;
  /** Mapowanie wartość komórki → kolor tła ARGB (np. PAID → zielony). */
  colorMap?: Record<string, string>;
}

export interface ReportMeta {
  /** Tytuł raportu, np. "Raport płatności". */
  title: string;
  /** Linijki opisujące zastosowane filtry. */
  filters: string[];
}

export interface SummaryRow {
  /** Etykieta w pierwszej kolumnie. */
  label: string;
  /** Wartości przypisane do kluczy kolumn. */
  values: Record<string, string | number | null>;
}

const VIOLET = 'FF6D28D9';
const GRAY = 'FF6B7280';
const SUMMARY_FILL = 'FFF3F0FF';
const HEADER_ROW = 5;

const NUMBER_FORMATS: Record<ColumnType, string | undefined> = {
  text: undefined,
  currency: '#,##0.00" zł"',
  number: '#,##0',
  percent: '0"%"',
  date: 'yyyy-mm-dd',
  datetime: 'yyyy-mm-dd hh:mm',
};

function applyType(
  cell: { value: unknown; numFmt?: string },
  type: ColumnType | undefined,
): void {
  if (!type || type === 'text') return;
  const fmt = NUMBER_FORMATS[type];
  if (fmt) cell.numFmt = fmt;
}

function autoWidth(
  column: ReportColumn,
  rows: Record<string, unknown>[],
): number {
  if (column.width) return column.width;
  let max = column.header.length;
  for (const row of rows) {
    const raw = row[column.key];
    let len: number;
    if (raw == null) continue;
    else if (raw instanceof Date) len = 10;
    else if (typeof raw === 'number') len = String(raw).length;
    else if (typeof raw === 'string') len = raw.length;
    else continue;
    if (len > max) max = len;
  }
  return Math.min(Math.max(max + 2, 10), 48);
}

export function buildReportSheet(
  workbook: Workbook,
  sheetName: string,
  columns: ReportColumn[],
  rows: Record<string, unknown>[],
  meta: ReportMeta,
  summaries: SummaryRow[] = [],
): Worksheet {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: HEADER_ROW }],
  });

  ws.columns = columns.map((c) => ({
    key: c.key,
    width: autoWidth(c, rows),
  }));

  const lastCol = columns.length;

  // ── Nagłówek dokumentu ──────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, lastCol);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `Academy — ${meta.title}`;
  titleCell.font = { bold: true, size: 14, color: { argb: VIOLET } };

  ws.mergeCells(2, 1, 2, lastCol);
  const filterCell = ws.getCell(2, 1);
  filterCell.value = meta.filters.length
    ? meta.filters.join('  ·  ')
    : 'Bez filtrów (wszystkie dane)';
  filterCell.font = { italic: true, size: 10, color: { argb: GRAY } };

  ws.mergeCells(3, 1, 3, lastCol);
  const dateCell = ws.getCell(3, 1);
  dateCell.value = `Wygenerowano: ${new Date().toLocaleString('pl-PL')}`;
  dateCell.font = { size: 9, color: { argb: GRAY } };

  // ── Wiersz nagłówków tabeli ─────────────────────────────────────────
  const headerRow = ws.getRow(HEADER_ROW);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: VIOLET },
    };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: VIOLET } } };
  });
  headerRow.height = 20;

  // ── Wiersze danych ──────────────────────────────────────────────────
  rows.forEach((row) => {
    const added = ws.addRow(row);
    columns.forEach((col, i) => {
      const cell = added.getCell(i + 1);
      applyType(cell, col.type);
      const argb = col.colorMap?.[String(row[col.key])];
      if (argb) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb },
        };
      }
    });
  });

  // ── Wiersze podsumowania ────────────────────────────────────────────
  summaries.forEach((summary, idx) => {
    const data: Record<string, unknown> = { [columns[0].key]: summary.label };
    for (const [key, value] of Object.entries(summary.values)) {
      data[key] = value;
    }
    const added = ws.addRow(data);
    columns.forEach((col, i) => {
      const cell = added.getCell(i + 1);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: SUMMARY_FILL },
      };
      if (idx === 0) {
        cell.border = { top: { style: 'medium', color: { argb: VIOLET } } };
      }
      if (summary.values[col.key] !== undefined) applyType(cell, col.type);
    });
  });

  return ws;
}
