const status = document.querySelector('#status');
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = 'Copied ✓'; button.disabled = true;
      if (status) status.textContent = 'Command copied. Run it in the extracted project folder.';
      setTimeout(() => { button.textContent = 'Copy command'; button.disabled = false; }, 2500);
    } catch { if (status) status.textContent = 'Select and copy the command above.'; }
  });
}
if (document.querySelector('#first-blob')) {
  fetch('evidence/activity-model-2026-11-05/run.json').then(r => { if (!r.ok) throw Error(); return r.json(); }).then(e => {
    document.querySelector('#first-blob').textContent = e.first.receipt.blobId;
    document.querySelector('#second-blob').textContent = e.second.receipt.blobId;
    document.querySelector('#before-label').textContent = e.first.proposal.preview.label;
    document.querySelector('#after-label').textContent = e.second.proposal.preview.label;
    const body = document.querySelector('#report-row'); body.replaceChildren();
    for (const row of e.second.exported.report.rows) {
      const tr = document.createElement('tr');
      for (const value of [row.digest, row.netAmountBaseUnits, row.label]) {
        const td = document.createElement('td'); td.textContent = value; td.style.overflowWrap = 'anywhere'; tr.append(td);
      }
      body.append(tr);
    }
  }).catch(() => { if (status) status.textContent = 'Saved evidence could not load. You can download it from the source repository.'; });
}
