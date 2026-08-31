import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Package, Plus, Printer, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import logo from "@/assets/logocanan.png";

type Company = "cana_paints" | "cana_services";
type Product = {
  _id: string;
  name: string;
  code: string;
  price: number;
  unit: string;
  status: string;
  image?: string;
};
type Line = {
  productId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
};
const entities: Record<Company, { name: string; descriptor: string }> = {
  cana_paints: {
    name: "CANA Paints",
    descriptor: "Paints · coatings · finishing solutions",
  },
  cana_services: {
    name: "CANA Services",
    descriptor: "Professional project and support services",
  },
};
const emptyLine = (): Line => ({
  productId: "",
  description: "",
  quantity: "1",
  unit: "unit",
  unitPrice: "",
});
const money = (value: number) =>
  Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 0 });
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] || character,
  );

export default function ProformaBuilderPage() {
  const [company, setCompany] = useState<Company>("cana_paints");
  const [products, setProducts] = useState<Product[]>([]);
  const [client, setClient] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [documentDetails, setDocumentDetails] = useState({
    number: `PF-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
    issueDate: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    clientReference: "",
    paymentTerms: "Payment before delivery",
  });
  const [notes, setNotes] = useState(
    "All prices are tax-inclusive. This proforma is valid for 7 days from the issue date.",
  );
  const [lines, setLines] = useState<Line[]>([emptyLine()]);
  const [error, setError] = useState("");
  useEffect(() => {
    void api
      .get<{ data: Product[] }>("/products")
      .then((response) =>
        setProducts(
          (response.data.data || []).filter(
            (product) => product.status === "Active",
          ),
        ),
      )
      .catch(() =>
        setError(
          "Unable to load products. You can still enter a service line manually.",
        ),
      );
  }, []);
  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + Number(line.quantity || 0) * Number(line.unitPrice || 0),
        0,
      ),
    [lines],
  );
  const updateLine = (index: number, change: Partial<Line>) =>
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...change } : line,
      ),
    );
  const chooseProduct = (index: number, productId: string) => {
    const product = products.find((item) => item._id === productId);
    updateLine(
      index,
      product
        ? {
            productId,
            description: product.name,
            unit: product.unit,
            unitPrice: String(product.price),
          }
        : { productId: "" },
    );
  };
  const print = () => {
    if (!client.name.trim())
      return setError("Enter the client name before printing.");
    if (!documentDetails.number.trim())
      return setError("Enter a proforma number before printing.");
    if (documentDetails.validUntil < documentDetails.issueDate)
      return setError("The validity date cannot be before the issue date.");
    if (
      !lines.some(
        (line) => line.description.trim() && Number(line.quantity) > 0,
      )
    )
      return setError("Add at least one product or service line.");
    const popup = window.open("", "_blank", "width=900,height=800");
    if (!popup) return;
    const entity = entities[company];
    const issued = new Date(documentDetails.issueDate).toLocaleDateString(
      "en-RW",
      {
        dateStyle: "long",
      },
    );
    const validUntil = new Date(documentDetails.validUntil).toLocaleDateString(
      "en-RW",
      { dateStyle: "long" },
    );
    popup.document.write(
      `<!doctype html><html><head><title>${escapeHtml(documentDetails.number)} · Proforma</title><style>body{font-family:Arial;color:#172033;margin:0}.page{max-width:760px;margin:28px auto;padding:42px}.head{display:flex;justify-content:space-between;border-bottom:3px solid #c8242f;padding-bottom:20px}.brand{display:flex;gap:13px;align-items:center}.logo{width:80px;max-height:60px;object-fit:contain}.brand-name{font-size:22px;font-weight:800}.muted{font-size:11px;color:#64748b;line-height:1.65}.title{text-align:right}.title h1{margin:0;font-size:30px}.badge{color:#b91c1c;font-size:10px;font-weight:bold;letter-spacing:1px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:28px 0}.card{border:1px solid #e5e7eb;border-radius:8px;padding:14px}.label{font-size:10px;color:#c8242f;font-weight:bold;letter-spacing:1.2px;text-transform:uppercase}.data{margin-top:8px;font-size:13px;line-height:1.7}table{width:100%;border-collapse:collapse;font-size:12px}th{background:#172033;color:white;padding:11px;text-align:left;font-size:10px;text-transform:uppercase}td{padding:12px 10px;border-bottom:1px solid #e5e7eb}th:nth-last-child(-n+3),td:nth-last-child(-n+3){text-align:right}.total{margin:24px 0 0 auto;width:270px;border-top:2px solid #172033;padding-top:10px;display:flex;justify-content:space-between;font-size:18px;font-weight:800}.notes{margin-top:34px;background:#fafafa;border-left:3px solid #c8242f;padding:14px;font-size:12px;line-height:1.65}.foot{margin-top:42px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:10px;color:#94a3b8}@media print{.page{margin:0}}</style></head><body><main class="page"><header class="head"><div class="brand"><img class="logo" src="${logo}" alt="CANA"><div><div class="brand-name">${entity.name}</div><div class="muted">${entity.descriptor}<br>Kigali, Rwanda · +250 789 408 367</div></div></div><div class="title"><h1>PROFORMA</h1><div class="badge">${escapeHtml(documentDetails.number)} · TAX INCLUSIVE</div><div class="muted">Issued: ${issued}<br>Valid until: ${validUntil}</div></div></header><section class="cards"><div class="card"><div class="label">Prepared for</div><div class="data"><strong>${escapeHtml(client.name)}</strong><br>${escapeHtml(client.phone)}<br>${escapeHtml(client.email)}<br>${escapeHtml(client.address)}</div></div><div class="card"><div class="label">Commercial terms</div><div class="data"><strong>${escapeHtml(documentDetails.paymentTerms)}</strong><br>${documentDetails.clientReference ? `Client reference: ${escapeHtml(documentDetails.clientReference)}` : "All prices include applicable taxes."}</div></div></section><table><thead><tr><th>Product / service</th><th>Qty</th><th>Unit price (tax incl.)</th><th>Amount (tax incl.)</th></tr></thead><tbody>${lines
        .filter((line) => line.description.trim())
        .map(
          (line) =>
            `<tr><td><strong>${escapeHtml(line.description)}</strong></td><td>${escapeHtml(line.quantity)} ${escapeHtml(line.unit)}</td><td>${money(Number(line.unitPrice))} RWF</td><td>${money(Number(line.quantity) * Number(line.unitPrice))} RWF</td></tr>`,
        )
        .join(
          "",
        )}</tbody></table><section class="total"><span>Total payable</span><span>${money(total)} RWF</span></section><div class="notes"><strong>Terms & notes</strong><br>${escapeHtml(notes)}</div><footer class="foot">${entity.name} · Quality · Service · Solutions</footer></main><script>window.onload=()=>window.print()</script></body></html>`,
    );
    popup.document.close();
  };
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        to="/management/sales"
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-600"
      >
        <ArrowLeft size={16} />
        Sales orders
      </Link>
      <header>
        <p className="text-sm font-medium text-red-600">Internal sales tool</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900">
          Create branded proforma
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          All entered catalogue prices are treated as tax-inclusive.
        </p>
      </header>
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}
      <div className="grid gap-6 lg:grid-cols-[.9fr_1.3fr]">
        <section className="space-y-5 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-bold">Document & client</h2>
          <label className="block text-sm font-semibold">
            Issue under
            <select
              value={company}
              onChange={(event) => setCompany(event.target.value as Company)}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="cana_paints">CANA Paints</option>
              <option value="cana_services">CANA Services</option>
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-600">
              Proforma number
              <input
                value={documentDetails.number}
                onChange={(event) =>
                  setDocumentDetails({
                    ...documentDetails,
                    number: event.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-gray-600">
              Client reference{" "}
              <span className="font-normal text-gray-400">(optional)</span>
              <input
                value={documentDetails.clientReference}
                onChange={(event) =>
                  setDocumentDetails({
                    ...documentDetails,
                    clientReference: event.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-gray-600">
              Issue date
              <input
                type="date"
                value={documentDetails.issueDate}
                onChange={(event) =>
                  setDocumentDetails({
                    ...documentDetails,
                    issueDate: event.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-gray-600">
              Valid until
              <input
                type="date"
                value={documentDetails.validUntil}
                onChange={(event) =>
                  setDocumentDetails({
                    ...documentDetails,
                    validUntil: event.target.value,
                  })
                }
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
              />
            </label>
          </div>
          {(["name", "phone", "email", "address"] as const).map((field) => (
            <input
              key={field}
              value={client[field]}
              onChange={(event) =>
                setClient({ ...client, [field]: event.target.value })
              }
              placeholder={`Client ${field}${field === "name" ? " *" : ""}`}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          ))}
          <div className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            Prices are tax-inclusive. No additional tax is calculated or added
            to this proforma.
          </div>
          <label className="block text-xs font-semibold text-gray-600">
            Payment terms
            <input
              value={documentDetails.paymentTerms}
              onChange={(event) =>
                setDocumentDetails({
                  ...documentDetails,
                  paymentTerms: event.target.value,
                })
              }
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </label>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
          />
          <button
            type="button"
            onClick={print}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white"
          >
            <Printer size={16} />
            Print / save proforma
          </button>
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold">Products & services</h2>
              <p className="mt-1 text-xs text-gray-500">
                Select a visible catalogue product, or enter a service manually.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLines((current) => [...current, emptyLine()])}
              className="inline-flex items-center gap-1 text-sm font-semibold text-red-600"
            >
              <Plus size={16} />
              Add line
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {lines.map((line, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-[1.55fr_.55fr_.65fr_.8fr_auto]">
                  <div className="space-y-2">
                    <label className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                      <Package size={13} />
                      Catalogue product
                    </label>
                    <select
                      value={line.productId}
                      onChange={(event) =>
                        chooseProduct(index, event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                    >
                      <option value="">Custom service / manual item</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} · {product.code} ·{" "}
                          {money(product.price)} RWF/{product.unit}
                        </option>
                      ))}
                    </select>
                    <input
                      value={line.description}
                      onChange={(event) =>
                        updateLine(index, {
                          description: event.target.value,
                          productId: "",
                        })
                      }
                      placeholder="Product or service description"
                      className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(index, { quantity: event.target.value })
                    }
                    placeholder="Qty"
                    className="self-end rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                  />
                  <input
                    value={line.unit}
                    onChange={(event) =>
                      updateLine(index, { unit: event.target.value })
                    }
                    placeholder="Unit"
                    className="self-end rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                  />
                  <input
                    type="number"
                    min="0"
                    value={line.unitPrice}
                    onChange={(event) =>
                      updateLine(index, { unitPrice: event.target.value })
                    }
                    placeholder="Tax-inclusive price"
                    className="self-end rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setLines((current) =>
                        current.filter((_, lineIndex) => lineIndex !== index),
                      )
                    }
                    title="Delete this line"
                    aria-label="Delete this proforma line"
                    className="self-end inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={17} />
                    <span className="hidden lg:inline">Delete</span>
                  </button>
                </div>
                {line.productId && (
                  <p className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-700">
                    <span className="block font-bold">
                      Selected product: {line.description}
                    </span>
                    <span className="block">
                      Catalogue code:{" "}
                      {products.find(
                        (product) => product._id === line.productId,
                      )?.code || "—"}{" "}
                      · Price used: {money(Number(line.unitPrice))} RWF per{" "}
                      {line.unit} · Tax included.
                    </span>
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-6 ml-auto max-w-xs border-t border-gray-200 pt-4 text-sm">
            <div className="flex justify-between text-lg font-bold">
              <span>Total payable</span>
              <span>{money(total)} RWF</span>
            </div>
            <p className="mt-1 text-right text-xs text-gray-500">
              Tax included in prices
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
