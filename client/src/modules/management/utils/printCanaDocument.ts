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
  company?: "CANA" | "CANA Paints" | "CANA Services" | "CANAN Business Group Ltd";
  brandLine?: string;
  recipient?: PrintParty;
  approval?: PrintApproval | null;
  orientation?: "portrait" | "landscape";
  theme?: "default" | "corporate";
};

const escapeHtml = (value: string | number | null | undefined) =>
  String(value ?? "—").replace(/[&<>'"]/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] || character,
  );

/** Optional legacy approval block for documents that explicitly require it. */
export const officialApprovalMarkup = (
  status = "Official system document",
  signatoryName = "KABANDA Fred",
  signatoryTitle = "Managing Director",
) => `<section style="display:flex;justify-content:space-between;align-items:end;gap:24px;margin-top:28px;break-inside:avoid"><div style="border:2px solid #af0808;color:#af0808;padding:8px 12px;font:800 11px Arial,sans-serif;letter-spacing:.8px;text-transform:uppercase">${escapeHtml(status)}</div><div style="width:260px;text-align:center;font:11px Arial,sans-serif"><p style="margin:0 0 5px;color:#af0808;font:700 11px Georgia,serif;letter-spacing:.25px;text-transform:uppercase">Authorised signatory</p><div style="display:grid;grid-template-columns:70px 1fr;align-items:end;gap:12px;height:76px"><img src="/print-assets/canan-business-stamp.png" alt="CANAN Business Group stamp" style="width:70px;height:70px;object-fit:contain;mix-blend-mode:multiply;opacity:.86"><div style="position:relative;height:70px;border-bottom:1px solid #111;overflow:visible"><img src="/print-assets/kabanda-fred-signature.png" alt="Signature of ${escapeHtml(signatoryName)}" style="position:absolute;left:50%;bottom:-7px;width:164px;height:66px;object-fit:contain;mix-blend-mode:multiply;transform:translateX(-50%) rotate(270deg);transform-origin:center"></div></div><strong style="display:block;margin-top:8px">${escapeHtml(signatoryName)}</strong><span style="display:block;margin-top:3px;color:#555">${escapeHtml(signatoryTitle)}</span></div></section>`;

/** Shared neutral CANA letterhead for the management system. */
export const cananLetterheadMarkup = (company = "CANAN BUSINESS GROUP LTD") => `<header style="display:grid;grid-template-columns:54px 1fr;gap:10px;align-items:center;border-bottom:1px solid #e5e7eb;padding:0 0 8px"><img src="${logo}" alt="CANA logo" style="width:48px;height:48px;object-fit:contain"><div><h1 style="margin:0;color:#111827;font:700 16px Arial,Helvetica,sans-serif">${escapeHtml(company)}</h1><p style="margin:4px 0 0;color:#4b5563;font:9px/1.4 Arial,Helvetica,sans-serif">Kigali, Rwanda · www.cana.rw · info@cana.rw · +250 789 408 367</p></div></header>`;

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
  brandLine,
  recipient,
  orientation = "portrait",
  theme = "corporate",
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
    ? `<section class="parties"><div class="party"><p class="section-title">From / issuer</p><strong>${escapeHtml(company)}</strong><p>Kigali, Rwanda<br>+250 789 408 367</p></div><div class="party"><p class="section-title">${escapeHtml(recipient.label)}</p><strong>${escapeHtml(recipient.name)}</strong><p>${(recipient.lines || []).filter(Boolean).map((line) => escapeHtml(line)).join("<br>") || "—"}</p></div></section>`
    : "";
  const tableHtml = table
    ? `<section class="section"><table><thead><tr>${table.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></section>`
    : "";
  const approvalHtml = "";

  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(title)} · ${escapeHtml(reference)}</title><style>
    @page{size:A4 ${orientation};margin:10mm}*{box-sizing:border-box}body{margin:0;background:#eef1f5;color:#111;font-family:Arial,Helvetica,sans-serif}.page{width:100%;max-width:${orientation === "landscape" ? "297mm" : "210mm"};min-height:${orientation === "landscape" ? "186mm" : "273mm"};margin:16px auto;background:#fff;padding:8mm 9mm 10mm}.letterhead{display:grid;grid-template-columns:76px 1fr;gap:13px;align-items:center;border-bottom:2px solid #af0808;padding-bottom:11px}.logo{width:72px;height:72px;object-fit:contain}.brand{text-align:center;padding-right:70px}.brand h1{margin:0;color:#111;font-family:Georgia,'Times New Roman',serif;font-size:21px;letter-spacing:.2px}.brand .brand-unit{margin:4px 0 0;color:#af0808;font:800 9px Arial,Helvetica,sans-serif;letter-spacing:1.4px;text-transform:uppercase}.brand p{margin:6px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:10px;line-height:1.45}.brand a{color:#af0808;text-decoration:underline}.doc-title{margin:18px 0 11px;text-align:center;color:#af0808;font-family:Georgia,'Times New Roman',serif;font-size:23px;font-weight:700;letter-spacing:.4px;text-transform:uppercase}.reference{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #171717}.reference div{min-height:40px;padding:7px 9px;border-right:1px solid #171717;font-size:10px}.reference div:last-child{border-right:0}.reference span,.section-title{display:block;margin-bottom:3px;color:#af0808;font-family:Georgia,'Times New Roman',serif;font-size:10px;font-weight:700;letter-spacing:.25px;text-transform:uppercase}.reference strong{font-size:11px}.parties{display:grid;grid-template-columns:1fr 1fr;margin-top:13px;border:1px solid #171717}.party{min-height:82px;padding:10px;border-right:1px solid #171717;font-size:11px;line-height:1.45}.party:last-child{border-right:0}.party p{margin:3px 0 0}.section{margin-top:13px}.details{display:grid;grid-template-columns:1fr 1fr;border:1px solid #171717}.detail{display:flex;justify-content:space-between;gap:10px;padding:7px 9px;border-right:1px solid #dedede;border-bottom:1px solid #dedede;font-size:10px}.detail:nth-child(2n){border-right:0}.detail:nth-last-child(-n+2){border-bottom:0}.detail span{color:#555}.detail strong{text-align:right}table{width:100%;border-collapse:collapse;font-size:10px}th{padding:7px;border:1px solid #171717;background:#af0808;color:#fff;font-family:Georgia,'Times New Roman',serif;font-size:10px;text-align:left}td{padding:7px;border:1px solid #171717;vertical-align:top;line-height:1.35}.note{margin-top:14px;border:1px solid #171717;padding:9px 10px;font-size:10px;line-height:1.5}.note strong{color:#af0808;font-family:Georgia,'Times New Roman',serif;text-transform:uppercase}.approval{display:flex;justify-content:space-between;align-items:end;gap:20px;margin-top:20px}.official-status{border:2px solid #af0808;color:#af0808;padding:7px 10px;font-size:10px;font-weight:800;letter-spacing:.7px;text-transform:uppercase}.signature{width:220px;text-align:center;font-size:10px}.approval-artwork{position:relative;height:72px;margin-top:4px}.stamp-image{position:absolute;left:0;bottom:0;width:68px;height:68px;object-fit:contain;mix-blend-mode:multiply;opacity:.86}.signature-image{position:absolute;right:0;bottom:0;width:136px;height:66px;object-fit:contain;mix-blend-mode:multiply}.sign-line{margin:2px 0 6px;border-top:1px solid #111}.signature strong,.signature span{display:block}.signature span{margin-top:2px;color:#555}.foot{margin-top:20px;border-top:1px solid #111;padding-top:8px;text-align:center;color:#af0808;font-size:10px;font-weight:700;letter-spacing:.3px;text-transform:uppercase}
    ${theme === "corporate" || company === "CANA Services" || company === "CANA Paints" ? `body{background:#fff;color:#1f2937}.page{margin:0 auto;padding:7mm 8mm 8mm}.letterhead{grid-template-columns:54px 1fr;gap:10px;border-bottom:1px solid #e5e7eb;padding-bottom:8px}.logo{width:48px;height:48px}.brand{text-align:left;padding-right:0}.brand h1{font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;letter-spacing:.1px}.brand .brand-unit{margin-top:3px;color:#b42318;font-size:8px;letter-spacing:.8px}.brand p{margin-top:4px;color:#4b5563;font:9px/1.4 Arial,Helvetica,sans-serif}.brand a{color:#b42318;text-decoration:none}.doc-title{margin:12px 0 8px;text-align:left;color:#111827;font:700 17px Arial,Helvetica,sans-serif;letter-spacing:0;text-transform:none}.reference{border:0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}.reference div{min-height:0;padding:6px 8px;border-right:1px solid #e5e7eb;font-size:9px}.reference span,.section-title{color:#b42318;font:700 8px Arial,Helvetica,sans-serif;letter-spacing:.45px}.reference strong{font-size:10px}.parties{margin-top:9px;border:1px solid #e5e7eb}.party{min-height:0;padding:8px;border-right:1px solid #e5e7eb;font-size:10px}.section{margin-top:9px}.details{border:0;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb}.detail{padding:5px 8px;border-right:1px solid #f1f3f5;border-bottom:1px solid #e5e7eb;font-size:9px}.detail span{color:#6b7280}table{font-size:9px}th{padding:6px 7px;border:0;border-bottom:2px solid #c2413b;background:#fff;color:#374151;font:700 8px Arial,Helvetica,sans-serif}td{padding:6px 7px;border:0;border-bottom:1px solid #e5e7eb;line-height:1.3}.note{margin-top:10px;border:0;border-left:2px solid #c2413b;background:#fafafa;padding:7px 9px;font-size:9px}.note strong{color:#b42318;font:700 8px Arial,Helvetica,sans-serif}.foot{margin-top:12px;border-top:1px solid #e5e7eb;padding-top:6px;color:#6b7280;font-size:8px;font-weight:500;letter-spacing:.1px;text-transform:none}@media print{body{background:#fff}.page{padding:0}}` : ""}
    @media print{body{background:#fff}.page{max-width:none;min-height:0;margin:0;padding:0}.detail{break-inside:avoid}tr{break-inside:avoid}}
  </style></head><body><main class="page"><header class="letterhead"><img class="logo" src="${logo}" alt="CANA logo"><div class="brand"><h1>${escapeHtml(company)}</h1>${brandLine ? `<p class="brand-unit">${escapeHtml(brandLine)}</p>` : ""}<p>Website: <a href="https://www.cana.rw">www.cana.rw</a> &nbsp; / &nbsp; Email: <a href="mailto:info@cana.rw">info@cana.rw</a> &nbsp; / &nbsp; Phone: +250 789 408 367</p></div></header><h2 class="doc-title">${escapeHtml(title)}</h2><section class="reference">${documentDetails.map((detail) => `<div><span>${escapeHtml(detail.label)}</span><strong>${escapeHtml(detail.value)}</strong></div>`).join("")}</section>${recipientHtml}${detailsHtml}${tableHtml}${notes ? `<section class="note"><strong>Notes & terms</strong><br>${escapeHtml(notes)}</section>` : ""}${approvalHtml}<footer class="foot">${escapeHtml(company)} · Kigali, Rwanda · +250 789 408 367</footer></main></body></html>`);
  popup.document.close();
  // Give the browser a moment to load the letterhead images before showing print.
  window.setTimeout(() => popup.print(), 350);
}
