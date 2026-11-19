import Product from "../product/product.model";
import RawMaterial from "../raw-materials/rawMaterial.model";

export const PRODUCTION_PACKAGING_NAMES = [
  "Imifuka",
  "Utudobo",
  "Indobo",
  "Stickers",
] as const;

const normalize = (value: unknown) => String(value || "").trim().toLowerCase();

export function packagingNamesForProduct(productName: string) {
  const name = normalize(productName);
  if (name.includes("plaster")) return ["Imifuka"];
  if (name.includes("wood glue")) return ["Utudobo"];
  return ["Indobo", "Stickers"];
}

export function isProductionPackagingName(name: string) {
  return PRODUCTION_PACKAGING_NAMES.some((item) => normalize(item) === normalize(name));
}

export async function getPackagingMaterialsForProduct(productName: string) {
  const allPackaging = await RawMaterial.find({
    name: { $in: [...PRODUCTION_PACKAGING_NAMES] },
  })
    .select("name code unit status costPerUnit")
    .lean();
  const byName = new Map(allPackaging.map((item: any) => [normalize(item.name), item]));
  const requiredNames = packagingNamesForProduct(productName);
  const required = requiredNames.map((name) => byName.get(normalize(name)));
  const missing = requiredNames.filter((_name, index) => !required[index] || required[index].status !== "Active");
  if (missing.length) {
    throw new Error(`Activate the required packaging material(s): ${missing.join(", ")}.`);
  }
  return { allPackaging, required: required as any[] };
}

export async function synchronizeFormulaPackaging(input: {
  productId: string;
  batchSize: number;
  outputs?: Array<{ packs?: number }>;
  items: any[];
}) {
  const product: any = await Product.findById(input.productId)
    .select("name packSizeKg")
    .lean();
  if (!product) throw new Error("Formula product not found.");

  const rawPackCount = Array.isArray(input.outputs) && input.outputs.length
    ? input.outputs.reduce((sum, output) => sum + Number(output.packs || 0), 0)
    : Number(input.batchSize || 0) / Number(product.packSizeKg || 0);
  const packCount = Math.round(rawPackCount);
  if (!Number.isFinite(rawPackCount) || rawPackCount <= 0 || Math.abs(rawPackCount - packCount) > 0.001) {
    throw new Error(
      `${product.name} output must make a whole number of packs before packaging can be calculated.`,
    );
  }

  const { allPackaging, required } = await getPackagingMaterialsForProduct(product.name);
  const packagingIds = new Set(allPackaging.map((item: any) => String(item._id)));
  const productionItems = (input.items || []).filter(
    (item: any) => !packagingIds.has(String(item.rawMaterial?._id || item.rawMaterial)),
  );
  const packagingItems = required.map((material: any) => ({
    rawMaterial: String(material._id),
    quantity: packCount,
    unit: "pcs",
    wastePercentage: 0,
    notes: `Automatic packaging · 1 ${material.name} per finished pack`,
  }));

  return {
    items: [...productionItems, ...packagingItems],
    packCount,
    packagingNames: required.map((item: any) => item.name),
  };
}
