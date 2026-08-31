// MonoBase Ver.0.7.26 search aliases
window.MONOBASE_MATERIAL_SEARCH_ALIASES = {
  "EL-013-AL": [
    "アルミ",
    "アルミニウム",
    "aluminum",
    "aluminium"
  ],
  "EL-022-TI": [
    "チタン",
    "titanium"
  ],
  "EL-024-CR": [
    "クロム",
    "chromium"
  ],
  "EL-026-FE": [
    "鉄",
    "アイアン",
    "iron"
  ],
  "EL-027-CO": [
    "コバルト",
    "cobalt"
  ],
  "EL-028-NI": [
    "ニッケル",
    "nickel"
  ],
  "EL-029-CU": [
    "銅",
    "カッパー",
    "copper"
  ],
  "EL-030-ZN": [
    "亜鉛",
    "ジンク",
    "zinc"
  ],
  "EL-047-AG": [
    "銀",
    "シルバー",
    "silver"
  ],
  "EL-050-SN": [
    "スズ",
    "錫",
    "ティン",
    "tin"
  ],
  "EL-074-W": [
    "タングステン",
    "ウォルフラム",
    "tungsten",
    "wolfram"
  ],
  "EL-078-PT": [
    "白金",
    "プラチナ",
    "platinum"
  ],
  "EL-079-AU": [
    "金",
    "ゴールド",
    "gold"
  ],
  "EL-080-HG": [
    "水銀",
    "マーキュリー",
    "mercury"
  ],
  "ITO": [
    "ITO",
    "酸化インジウムスズ",
    "indium tin oxide"
  ],
  "IGZO": [
    "IGZO",
    "イグゾー"
  ]
};
window.monoBaseMaterialSearchText = function(material){
  const a = window.MONOBASE_MATERIAL_SEARCH_ALIASES || {};
  const vals = [
    material && material.id,
    material && material.name_ja,
    material && material.name_en,
    material && material.symbol,
    material && material.formula,
    ...(a[material && material.id] || [])
  ].filter(Boolean);
  return vals.join(" ").toLowerCase();
};
