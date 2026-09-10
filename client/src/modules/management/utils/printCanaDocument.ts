import logo from "@/assets/logocanan.png";

export type PrintDetail = { label: string; value?: string | number | null };
export type PrintTable = { headers: string[]; rows: Array<Array<string | number | null | undefined>> };
export type PrintParty = { label: string; name: string; lines?: Array<string | null | undefined> };
export type PrintApproval = { status: string; signatoryTitle: string; signatoryName: string };

type PrintDocumentOptions = {
  issueDate?: string;
  title: string;
  reference: string;
  status?: string;
  details?: PrintDetail[];
  table?: PrintTable;
  notes?: string;
  company?: "CANA Paints" | "CANA Services" | "CANAN Business Group Ltd";
  recipient?: PrintParty;
  approval?: PrintApproval;
};

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "—").replace(/[&<>'"]/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character,
  );

/** Reusable managing-director approval block for every printed CANAN document. */
export const officialApprovalMarkup = (
  status = "Official system document",
  signatoryName = "KABANDA Fred",
  signatoryTitle = "Managing Director",
) => `<section style="display:flex;justify-content:space-between;align-items:end;gap:24px;margin-top:28px;break-inside:avoid"><div style="border:2px solid #af0808;color:#af0808;padding:8px 12px;font:800 11px Arial,sans-serif;letter-spacing:.8px;text-transform:uppercase">${escapeHtml(status)}</div><div style="width:260px;text-align:center;font:11px Arial,sans-serif"><p style="margin:0 0 5px;color:#af0808;font:700 11px Georgia,serif;letter-spacing:.25px;text-transform:uppercase">Authorised signatory</p><div style="display:grid;grid-template-columns:70px 1fr;align-items:end;gap:12px;height:76px"><img src="/print-assets/canan-business-stamp.png" alt="CANAN Business Group stamp" style="width:70px;height:70px;object-fit:contain;mix-blend-mode:multiply;opacity:.86"><div style="position:relative;height:70px;border-bottom:1px solid #111;overflow:visible"><img src="/print-assets/kabanda-fred-signature.png" alt="Signature of ${escapeHtml(signatoryName)}" style="position:absolute;left:50%;bottom:-7px;width:164px;height:66px;object-fit:contain;mix-blend-mode:multiply;transform:translateX(-50%) rotate(270deg);transform-origin:center"></div></div><strong style="display:block;margin-top:8px">${escapeHtml(signatoryName)}</strong><span style="display:block;margin-top:3px;color:#555">${escapeHtml(signatoryTitle)}</span></div></section>`;

/** Shared letterhead based on the approved CANAN invoice format. */
export const cananLetterheadMarkup = () => `<header style="display:grid;grid-template-columns:92px 1fr;gap:16px;align-items:center;border-bottom:1px solid #111;padding:0 0 13px"><img src="${logo}" alt="CANAN logo" style="width:86px;height:86px;object-fit:contain"><div style="padding-right:82px;text-align:center"><p style="margin:0 0 4px;color:#af0808;font:700 9px Arial,sans-serif;letter-spacing:1.2px;text-transform:uppercase">Official company letterhead</p><h1 style="margin:0;color:#111;font:23px Georgia,'Times New Roman',serif;letter-spacing:.2px">CANAN BUSINESS GROUP LTD</h1><p style="margin:7px 0 0;font:11px/1.55 Georgia,'Times New Roman',serif">Kigali, Rwanda<br>Website: <span style="color:#1268c7;text-decoration:underline">www.cana.rw</span> &nbsp; / &nbsp; Email: <span style="color:#1268c7;text-decoration:underline">info@cana.rw</span> &nbsp; / &nbsp; Phone: +250 789 408 367 · 078 663 6431<br>Equity Bank: 4012200667552 &nbsp; · &nbsp; TIN: 106864122</p></div></header>`;

/** Opens a letterhead-style CANA document that can be printed or saved as PDF. */
export function printCanaDocument({
  issueDate,
  title,
  reference,
  status,
  details = [],
  table,
  notes,
  company = "CANAN Business Group Ltd",
  recipient,
  approval,
}: PrintDocumentOptions) {
  const popup = window.open("", "_blank", "width=1000,height=820");
  if (!popup) {
    window.alert("Printing was blocked by your browser. Please allow pop-ups for this CANA site, then try again.");
    return;
  }

  const issued = (issueDate ? new Date(issueDate) : new Date()).toLocaleDateString("en-RW", { dateStyle: "long" });
  const documentDetails = [
    { label: "Reference no.", value: reference },
    { label: "Issue date", value: issued },
    ...(status ? [{ label: "Status", value: status }] : []),
  ];
  const detailsHtml = details.length
    ? `<section class="section"><p class="section-title">Document summary</p><div class="details">${details.map((detail) => `<div class="detail"><span>${escapeHtml(detail.label)}</span><strong>${escapeHtml(detail.value)}</strong></div>`).join("")}</div></section>`
    : "";
  const recipientHtml = recipient
    ? `<section class="parties"><div class="party"><p class="section-title">From / issuer</p><strong>${escapeHtml(company)}</strong><p>CANAN Business Group Ltd<br>Kigali, Rwanda<br>+250 789 408 367 · 078 663 6431</p></div><div class="party"><p class="section-title">${escapeHtml(recipient.label)}</p><strong>${escapeHtml(recipient.name)}</strong><p>${(recipient.lines || []).filter(Boolean).map((line) => escapeHtml(line)).join("<br>") || "—"}</p></div></section>`
    : "";
  const tableHtml = table
    ? `<section class="section"><table><thead><tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`
    : "";
  const resolvedApproval = approval || {
    status: "Official system document",
    signatoryTitle: "Managing Director",
    signatoryName: "KABANDA Fred",
  };
  const approvalHtml = officialApprovalMarkup(
    resolvedApproval.status,
    resolvedApproval.signatoryName,
    resolvedApproval.signatoryTitle,
  );

  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(title)} · ${escapeHtml(reference)}</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#111;font-family:Arial,Helvetica,sans-serif}.page{width:100%;max-width:210mm;min-height:273mm;margin:20px auto;background:#fff;padding:11mm 12mm 14mm}.letterhead{display:grid;grid-template-columns:92px 1fr;gap:16px;align-items:center;border-bottom:1px solid #111;padding-bottom:13px}.logo{width:86px;height:86px;object-fit:contain}.brand{text-align:center;padding-right:82px}.brand h1{margin:0;color:#111;font-family:Georgia,'Times New Roman',serif;font-size:23px;letter-spacing:.2px}.brand p{margin:7px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:11px;line-height:1.55}.brand a{color:#1268c7;text-decoration:underline}.doc-title{margin:25px 0 15px;text-align:center;color:#af0808;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:700;letter-spacing:.4px;text-transform:uppercase}.reference{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #171717}.reference div{min-height:46px;padding:8px 10px;border-right:1px solid #171717;font-size:11px}.reference div:last-child{border-right:0}.reference span,.section-title{display:block;margin-bottom:4px;color:#af0808;font-family:Georgia,'Times New Roman',serif;font-size:11px;font-weight:700;letter-spacing:.25px;text-transform:uppercase}.reference strong{font-size:12px}.parties{display:grid;grid-template-columns:1fr 1fr;margin-top:17px;border:1px solid #171717}.party{min-height:96px;padding:12px;border-right:1px solid #171717;font-size:12px;line-height:1.55}.party:last-child{border-right:0}.party p{margin:4px 0 0}.section{margin-top:17px}.details{display:grid;grid-template-columns:1fr 1fr;border:1px solid #171717}.detail{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-right:1px solid #dedede;border-bottom:1px solid #dedede;font-size:11px}.detail:nth-child(2n){border-right:0}.detail:nth-last-child(-n+2){border-bottom:0}.detail span{color:#555}.detail strong{text-align:right}table{width:100%;border-collapse:collapse;font-size:11px}th{padding:9px 8px;border:1px solid #171717;background:#af0808;color:#fff;font-family:Georgia,'Times New Roman',serif;font-size:11px;text-align:left}td{padding:9px 8px;border:1px solid #171717;vertical-align:top;line-height:1.4}.note{margin-top:18px;border:1px solid #171717;padding:11px 12px;font-size:11px;line-height:1.6}.note strong{color:#af0808;font-family:Georgia,'Times New Roman',serif;text-transform:uppercase}.approval{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-top:28px}.official-status{border:2px solid #af0808;color:#af0808;padding:8px 12px;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase}.signature{width:230px;text-align:center;font-size:11px}.approval-artwork{position:relative;height:78px;margin-top:6px}.stamp-image{position:absolute;left:0;bottom:0;width:74px;height:74px;object-fit:contain;mix-blend-mode:multiply;opacity:.86}.signature-image{position:absolute;right:0;bottom:0;width:146px;height:72px;object-fit:contain;mix-blend-mode:multiply}.sign-line{margin:2px 0 7px;border-top:1px solid #111}.signature strong,.signature span{display:block}.signature span{margin-top:3px;color:#555}.foot{margin-top:30px;border-top:1px solid #111;padding-top:10px;text-align:center;color:#af0808;font-size:11px;font-weight:700;letter-spacing:.35px;text-transform:uppercase}@media print{body{background:#fff}.page{max-width:none;min-height:0;margin:0;padding:0}.detail{break-inside:avoid}tr{break-inside:avoid}}
  </style></head><body><main class="page"><header class="letterhead"><img class="logo" src="${logo}" alt="CANAN logo"><div class="brand"><h1>CANAN BUSINESS GROUP LTD</h1><p>Website: <a href="https://www.cana.rw">www.cana.rw</a> &nbsp; / &nbsp; Email: <a href="mailto:info@cana.rw">info@cana.rw</a> &nbsp; / &nbsp; Phone: +250 789 408 367 · 078 663 6431<br>Equity Bank: 4012200667552<br>TIN: 106864122</p></div></header><h2 class="doc-title">${escapeHtml(title)}</h2><section class="reference">${documentDetails.map((detail) => `<div><span>${escapeHtml(detail.label)}</span><strong>${escapeHtml(detail.value)}</strong></div>`).join("")}</section>${recipientHtml}${detailsHtml}${tableHtml}${notes ? `<section class="note"><strong>Notes & terms</strong><br>${escapeHtml(notes)}</section>` : ""}${approvalHtml}<footer class="foot">CANAN BUSINESS GROUP LTD · Kigali, Rwanda · +250 789 408 367 · 078 663 6431</footer></main></body></html>`);
  popup.document.close();
  // Give the browser a moment to load the letterhead images before showing print.
  window.setTimeout(() => popup.print(), 350);
}
