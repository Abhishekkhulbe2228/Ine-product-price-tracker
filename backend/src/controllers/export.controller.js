import { generateCsvExport } from '../services/export.service.js';

export async function exportCsvHandler(req, res, next) {
  try {
    const csv = await generateCsvExport();

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="scrape-history.csv"'
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
}
