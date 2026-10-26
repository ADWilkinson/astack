// src/export.ts at the merge commit
export async function exportCsv(account: Account, res: Response) {
  res.setHeader("content-type", "text/csv");
  res.write(header(account));
  const cursor = rowsFor(account);
  let row = await cursor.next();
  while (row) {
    res.write(toCsv(row));
    row = await cursor.next();
    if (!row) res.end();
  }
}
