const status = document.querySelector('#status');
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = 'Copied ✓'; button.disabled = true;
      if (status) status.textContent = 'Command copied. Run it inside the extracted Recall-Agent folder.';
      setTimeout(() => { button.textContent = 'Copy command'; button.disabled = false; }, 2500);
    } catch { if (status) status.textContent = 'Select and copy the command above.'; }
  });
}
const rows = document.querySelector('#record-rows');
if (rows) {
  fetch('evidence/own-account-completion-live-2026-11-07/run.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(run => {
    if (run.candidateCompletedReceiptCount !== 10 || run.allRecords.length !== 10) throw Error();
    rows.replaceChildren();
    for (const [index, row] of run.allRecords.entries()) {
      const record = row.record;
      const purpose = record.schema === 'recall-transaction-fact/1' ? record.digest
        : record.schema === 'recall-tool-experience/1' ? `${record.tool}: ${record.verdict} · limit ${record.attempted}`
        : 'Verified gas-payer hypothesis mismatch';
      const tr = document.createElement('tr');
      for (const text of [String(index + 1), purpose, row.blobId]) {
        const td = document.createElement('td'); td.textContent = text; td.style.overflowWrap = 'anywhere'; tr.append(td);
      }
      rows.append(tr);
    }
  }).catch(() => { if (status) status.textContent = 'Saved evidence could not load. Use the receipt link above.'; });
}
