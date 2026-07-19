"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/utils/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  category_id: number;
  name: string;
}

interface Brand {
  brand_id: number;
  name: string;
}

interface VariantGroup {
  id: string; // local temp id
  name: string;
  options: string[];
  newOptionDraft: string;
}

interface VariantCombination {
  combination: { group_name: string; option_value: string }[];
  label: string;
  sku: string;
  price: string;
  stock: string;
  barcode: string;
  weight_grams: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cartesian product of multiple arrays */
function cartesian<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];
  const [first, ...rest] = arrays;
  const restProduct = cartesian(rest);
  return first.flatMap((item) => restProduct.map((combo) => [item, ...combo]));
}

function generateCombinations(groups: VariantGroup[], baseSku: string, basePrice: string): VariantCombination[] {
  const validGroups = groups.filter((g) => g.name.trim() && g.options.length > 0);
  if (validGroups.length === 0) return [];

  const groupOptions = validGroups.map((g) =>
    g.options.map((opt) => ({ group_name: g.name.trim(), option_value: opt }))
  );

  const product = cartesian(groupOptions);

  return product.map((combo, idx) => {
    const label = combo.map((c) => `${c.group_name}: ${c.option_value}`).join(" | ");
    const skuSuffix = combo.map((c) => c.option_value.toUpperCase().replace(/\s+/g, "-")).join("-");
    return {
      combination: combo,
      label,
      sku: baseSku ? `${baseSku}-${skuSuffix}` : skuSuffix,
      price: basePrice || "",
      stock: "0",
      barcode: "",
      weight_grams: "",
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateProductPage() {
  const router = useRouter();

  // Basic info
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    short_description: "",
    price: "",
    sku: "",
    barcode: "",
    status: "Active",
    categoryId: "",
    brandId: "",
    is_featured: false,
    meta_title: "",
    meta_description: "",
    stockQuantity: "0",
  });

  // Images
  const [files, setFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  // Variant groups (admin defines these)
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);

  // Auto-generated combinations
  const [combinations, setCombinations] = useState<VariantCombination[]>([]);

  // UI state
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Load categories & brands
  useEffect(() => {
    api.get("/categories").then((res: any) => {
      if (res.success && res.data) setCategories(res.data);
    });
    api.get("/brands").then((res: any) => {
      if (res.success && res.data) setBrands(res.data);
    });
  }, []);

  // Re-generate combinations whenever groups or base SKU/price changes
  useEffect(() => {
    const newCombos = generateCombinations(variantGroups, formData.sku, formData.price);

    // Preserve user edits: merge with existing combinations by label
    setCombinations((prev) => {
      const prevMap = new Map(prev.map((c) => [c.label, c]));
      return newCombos.map((c) => {
        const existing = prevMap.get(c.label);
        return existing ? { ...c, sku: existing.sku, price: existing.price, stock: existing.stock, barcode: existing.barcode, weight_grams: existing.weight_grams } : c;
      });
    });
  }, [variantGroups, formData.sku, formData.price]);

  // Image preview
  useEffect(() => {
    if (!files) { setImagePreviews([]); return; }
    const urls = Array.from(files).map((f) => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  // ─── Group management ────────────────────────────────────────────────────

  const addGroup = () => {
    setVariantGroups((prev) => [
      ...prev,
      { id: `g-${Date.now()}`, name: "", options: [], newOptionDraft: "" },
    ]);
  };

  const removeGroup = (id: string) => {
    setVariantGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const updateGroupName = (id: string, name: string) => {
    setVariantGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
  };

  const updateGroupDraft = (id: string, draft: string) => {
    setVariantGroups((prev) => prev.map((g) => (g.id === id ? { ...g, newOptionDraft: draft } : g)));
  };

  const addOption = (id: string) => {
    setVariantGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const trimmed = g.newOptionDraft.trim();
        if (!trimmed) return g;
        const duplicate = g.options.some((o) => o.toLowerCase() === trimmed.toLowerCase());
        if (duplicate) return g;
        return { ...g, options: [...g.options, trimmed], newOptionDraft: "" };
      })
    );
  };

  const removeOption = (groupId: string, option: string) => {
    setVariantGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o) => o !== option) } : g))
    );
  };

  // ─── Combination field edit ───────────────────────────────────────────────

  const updateCombination = (idx: number, field: keyof VariantCombination, value: string) => {
    setCombinations((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    );
  };

  // ─── Validation ───────────────────────────────────────────────────────────

  const validateStep1 = () => {
    if (!formData.name.trim()) return "Product name is required";
    if (!formData.price || parseFloat(formData.price) < 0) return "Valid price is required";
    if (!formData.sku.trim()) return "Base SKU is required";
    if (!formData.categoryId) return "Category is required";
    return null;
  };

  const validateStep2 = () => {
    for (const g of variantGroups) {
      if (!g.name.trim()) return "All variant groups must have a name";
      if (g.options.length === 0) return `Variant group "${g.name}" must have at least one option`;
    }
    return null;
  };

  const validateStep3 = () => {
    const skuSet = new Set<string>();
    for (const c of combinations) {
      if (!c.sku.trim()) return `SKU is required for combination: ${c.label}`;
      if (parseInt(c.stock) < 0) return `Stock cannot be negative for: ${c.label}`;
      if (skuSet.has(c.sku.trim())) return `Duplicate SKU: "${c.sku}"`;
      skuSet.add(c.sku.trim());
    }
    return null;
  };

  const goToStep2 = () => {
    const err = validateStep1();
    if (err) { setFormError(err); return; }
    setFormError(null);
    setActiveStep(2);
  };

  const goToStep3 = () => {
    const err = validateStep2();
    if (err) { setFormError(err); return; }
    if (variantGroups.length > 0 && combinations.length === 0) {
      setFormError("No combinations could be generated. Ensure all groups have at least one option.");
      return;
    }
    setFormError(null);
    setActiveStep(3);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (combinations.length > 0) {
      const err = validateStep3();
      if (err) { setFormError(err); return; }
    }
    setFormError(null);
    setSubmitting(true);

    try {
      const hasVariants = variantGroups.length > 0 && combinations.length > 0;
      const formPayload = new FormData();

      // Base product fields
      formPayload.append("name", formData.name);
      formPayload.append("description", formData.description);
      formPayload.append("short_description", formData.short_description);
      formPayload.append("price", formData.price);
      formPayload.append("sku", formData.sku);
      formPayload.append("barcode", formData.barcode);
      formPayload.append("status", formData.status);
      formPayload.append("categoryId", formData.categoryId);
      formPayload.append("brandId", formData.brandId);
      formPayload.append("is_featured", String(formData.is_featured));
      formPayload.append("meta_title", formData.meta_title);
      formPayload.append("meta_description", formData.meta_description);
      formPayload.append("stockQuantity", formData.stockQuantity);

      // Images
      if (files) {
        for (let i = 0; i < files.length; i++) formPayload.append("images", files[i]);
      }

      const endpoint = hasVariants ? "/products/with-variants" : "/products";

      if (hasVariants) {
        const cleanGroups = variantGroups
          .filter((g) => g.name.trim() && g.options.length > 0)
          .map((g) => ({ name: g.name.trim(), options: g.options }));

        const cleanVariants = combinations.map((c) => ({
          combination: c.combination,
          sku: c.sku.trim(),
          price: c.price ? parseFloat(c.price) : null,
          stock: parseInt(c.stock) || 0,
          barcode: c.barcode || null,
          weight_grams: c.weight_grams ? parseInt(c.weight_grams) : null,
        }));

        formPayload.append("variant_groups", JSON.stringify(cleanGroups));
        formPayload.append("variants", JSON.stringify(cleanVariants));
      }

      await api.post(endpoint, formPayload);
      setSuccessMsg("Product created successfully!");
      setTimeout(() => router.push("/products"), 1500);
    } catch (err: any) {
      setFormError(err.message || "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render helpers ───────────────────────────────────────────────────────

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/10 transition-colors";
  const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";
  const selectCls = `${inputCls} dark:bg-gray-900`;

  const steps = [
    { num: 1, label: "Basic Info" },
    { num: 2, label: "Variants" },
    { num: 3, label: "Review & Save" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Create New Product</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 font-normal">
            Define product details, add dynamic variant groups, and configure each combination.
          </p>
        </div>
        <button
          onClick={() => router.push("/products")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          ← Back to Products
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-white dark:bg-white/[0.03] shadow-theme-xs">
        {steps.map((step, idx) => (
          <button
            key={step.num}
            onClick={() => {
              if (step.num < activeStep) setActiveStep(step.num as 1 | 2 | 3);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-semibold transition-colors ${
              activeStep === step.num
                ? "bg-brand-500 text-white"
                : step.num < activeStep
                ? "bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 cursor-pointer hover:bg-brand-100"
                : "text-gray-400 dark:text-gray-500 cursor-not-allowed"
            } ${idx > 0 ? "border-l border-gray-200 dark:border-gray-800" : ""}`}
          >
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              activeStep === step.num ? "bg-white/30 text-white" : step.num < activeStep ? "bg-brand-500 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
            }`}>{step.num < activeStep ? "✓" : step.num}</span>
            {step.label}
          </button>
        ))}
      </div>

      {/* Global error / success */}
      {formError && (
        <div className="p-4 rounded-xl border border-error-200 dark:border-error-800 bg-error-50 dark:bg-error-950/20 text-sm text-error-600 dark:text-error-400">
          {formError}
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl border border-success-200 dark:border-success-800 bg-success-50 dark:bg-success-950/20 text-sm text-success-600 dark:text-success-400">
          {successMsg}
        </div>
      )}

      {/* ─── STEP 1: Basic Info ────────────────────────────────────────────── */}
      {activeStep === 1 && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs p-6 space-y-5">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Product Information</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <label className={labelCls}>Product Name *</label>
              <input type="text" className={inputCls} placeholder="e.g. Premium Cotton T-Shirt"
                value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div>
              <label className={labelCls}>Base SKU *</label>
              <input type="text" className={inputCls} placeholder="e.g. SHIRT-001"
                value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })} />
              <p className="mt-1 text-xs text-gray-400">Variant SKUs will be auto-generated from this (e.g. SHIRT-001-RED-XL)</p>
            </div>

            <div>
              <label className={labelCls}>Base Price (₹) *</label>
              <input type="number" step="0.01" className={inputCls} placeholder="e.g. 999.00"
                value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} />
            </div>

            <div>
              <label className={labelCls}>Category *</label>
              <select className={selectCls} value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}>
                <option value="">Select Category</option>
                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Brand</label>
              <select className={selectCls} value={formData.brandId}
                onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}>
                <option value="">No Brand</option>
                {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Status</label>
              <select className={selectCls} value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Archived">Archived</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>Barcode (Optional)</label>
              <input type="text" className={inputCls} placeholder="e.g. 1234567890123"
                value={formData.barcode} onChange={(e) => setFormData({ ...formData, barcode: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Short Description</label>
              <input type="text" className={inputCls} placeholder="One-line product summary"
                value={formData.short_description} onChange={(e) => setFormData({ ...formData, short_description: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Full Description</label>
              <textarea rows={4} className={`${inputCls} resize-none`} placeholder="Detailed product description..."
                value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div className="md:col-span-2">
              <label className={labelCls}>Product Images (up to 5)</label>
              <input type="file" multiple accept="image/*" onChange={(e) => setFiles(e.target.files)}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 dark:file:bg-brand-950/30 file:text-brand-700 dark:file:text-brand-400 hover:file:bg-brand-100 cursor-pointer" />
              {imagePreviews.length > 0 && (
                <div className="mt-3 flex gap-3 flex-wrap">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-[9px] bg-brand-500/90 text-white py-0.5">Primary</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Only show stock quantity for non-variant products */}
            <div>
              <label className={labelCls}>Stock Quantity <span className="text-gray-400 font-normal">(for simple products without variants)</span></label>
              <input type="number" className={inputCls} placeholder="0"
                value={formData.stockQuantity} onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })} />
            </div>

            <div className="flex items-center gap-3 self-end pb-1">
              <input type="checkbox" id="is_featured" checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-4 h-4 accent-brand-500" />
              <label htmlFor="is_featured" className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                Mark as Featured Product
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button onClick={goToStep2}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-theme-xs">
              Next: Add Variants →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 2: Variant Builder ───────────────────────────────────────── */}
      {activeStep === 2 && (
        <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Variant Groups</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                Add as many variant attributes as needed. Leave empty to create a simple product.
              </p>
            </div>
            <button onClick={addGroup}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-theme-xs whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Variant Group
            </button>
          </div>

          {variantGroups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-950/20 flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">No variant groups yet</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add Variant Group" to define attributes like Color, Size, Storage, etc.</p>
            </div>
          )}

          <div className="space-y-4">
            {variantGroups.map((group, gi) => (
              <div key={group.id} className="rounded-xl border border-gray-200 dark:border-gray-700 p-5 bg-gray-50/50 dark:bg-white/[0.02] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className={labelCls}>Attribute Name *</label>
                    <input type="text" className={inputCls} placeholder="e.g. Color, Size, Storage, Weight..."
                      value={group.name} onChange={(e) => updateGroupName(group.id, e.target.value)} />
                  </div>
                  <button onClick={() => removeGroup(group.id)}
                    className="mt-6 p-2 rounded-lg text-error-500 hover:bg-error-50 dark:hover:bg-error-950/20 transition-colors" title="Remove group">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Option values */}
                <div>
                  <label className={labelCls}>Values</label>
                  <div className="flex flex-wrap gap-2 mb-3 min-h-[32px]">
                    {group.options.map((opt) => (
                      <span key={opt} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 text-sm font-medium">
                        {opt}
                        <button onClick={() => removeOption(group.id, opt)}
                          className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-200 dark:hover:bg-brand-900 transition-colors">
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </span>
                    ))}
                    {group.options.length === 0 && <span className="text-xs text-gray-400 self-center">No values added yet</span>}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" className={inputCls} placeholder="Enter a value and press Add or Enter"
                      value={group.newOptionDraft}
                      onChange={(e) => updateGroupDraft(group.id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOption(group.id); } }} />
                    <button onClick={() => addOption(group.id)}
                      className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-sm font-semibold text-gray-700 dark:text-white rounded-lg transition-colors whitespace-nowrap">
                      + Add
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Preview of generated combinations count */}
          {combinations.length > 0 && (
            <div className="p-3 rounded-xl bg-success-50 dark:bg-success-950/20 border border-success-200 dark:border-success-800 text-sm text-success-700 dark:text-success-400">
              ✓ {combinations.length} variant combination{combinations.length > 1 ? "s" : ""} will be generated automatically.
            </div>
          )}

          <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between">
            <button onClick={() => setActiveStep(1)}
              className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              ← Back
            </button>
            <button onClick={goToStep3}
              className="px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg transition-colors shadow-theme-xs">
              Next: Review & Save →
            </button>
          </div>
        </div>
      )}

      {/* ─── STEP 3: Review combinations & Save ───────────────────────────── */}
      {activeStep === 3 && (
        <div className="space-y-6">
          {/* Product summary card */}
          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs p-6">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Product Summary</h2>
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {[
                { label: "Name", value: formData.name },
                { label: "Base SKU", value: formData.sku },
                { label: "Base Price", value: formData.price ? `₹${formData.price}` : "—" },
                { label: "Category", value: categories.find((c) => c.category_id.toString() === formData.categoryId)?.name || "—" },
                { label: "Brand", value: brands.find((b) => b.brand_id.toString() === formData.brandId)?.name || "No Brand" },
                { label: "Status", value: formData.status },
                { label: "Variant Groups", value: variantGroups.filter((g) => g.name && g.options.length > 0).length.toString() },
                { label: "Combinations", value: combinations.length.toString() },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-gray-400 dark:text-gray-500 font-medium">{item.label}</dt>
                  <dd className="mt-0.5 font-semibold text-gray-800 dark:text-white truncate">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Combinations table */}
          {combinations.length > 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs overflow-hidden">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                  Variant Combinations <span className="text-gray-400 font-normal text-base ml-2">({combinations.length} total)</span>
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                  Edit SKU, price, and stock for each combination. Barcode and weight are optional.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      {["Combination", "SKU *", "Price (₹)", "Stock *", "Barcode", "Weight (g)"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {combinations.map((combo, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-white whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {combo.combination.map((c, ci) => (
                              <span key={ci} className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                                <span className="text-gray-400 dark:text-gray-500 mr-1">{c.group_name}:</span>{c.option_value}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <input type="text" value={combo.sku}
                            onChange={(e) => updateCombination(idx, "sku", e.target.value.toUpperCase())}
                            className="w-36 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-xs font-mono text-gray-800 dark:text-white focus:border-brand-500 focus:outline-none" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" step="0.01" value={combo.price} placeholder="Base"
                            onChange={(e) => updateCombination(idx, "price", e.target.value)}
                            className="w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-xs text-gray-800 dark:text-white focus:border-brand-500 focus:outline-none" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" value={combo.stock}
                            onChange={(e) => updateCombination(idx, "stock", e.target.value)}
                            className="w-20 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-xs text-gray-800 dark:text-white focus:border-brand-500 focus:outline-none" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="text" value={combo.barcode} placeholder="Optional"
                            onChange={(e) => updateCombination(idx, "barcode", e.target.value)}
                            className="w-32 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-xs text-gray-800 dark:text-white focus:border-brand-500 focus:outline-none" />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" value={combo.weight_grams} placeholder="Optional"
                            onChange={(e) => updateCombination(idx, "weight_grams", e.target.value)}
                            className="w-24 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-1.5 text-xs text-gray-800 dark:text-white focus:border-brand-500 focus:outline-none" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs p-8 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No variants defined. This will be created as a simple product with a single stock quantity.
              </p>
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03] shadow-theme-xs p-5 flex justify-between items-center">
            <button onClick={() => setActiveStep(2)}
              className="px-5 py-2.5 text-sm font-semibold text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              ← Back
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-8 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors shadow-theme-xs inline-flex items-center gap-2">
              {submitting ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating Product...</>
              ) : (
                "✓ Create Product"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
