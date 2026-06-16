export function normalizeBrazilianText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s\+]/g, "")   // deixa apenas letras, números, espaços e + (ex: disney+)
    .replace(/\s+/g, " ")            // remove espaços múltiplos
    .trim();
}

export function cleanAiCategoryId(id: string | null): string | null {
  if (!id) return null;
  let finalCategoryId = id.trim().replace(/['"{}[\]]/g, '').trim();
  if (finalCategoryId.toLowerCase().startsWith('id:')) finalCategoryId = finalCategoryId.slice(3).trim();
  else if (finalCategoryId.toLowerCase().startsWith('id-')) finalCategoryId = finalCategoryId.slice(3).trim();
  else if (finalCategoryId.toLowerCase().startsWith('id_')) finalCategoryId = finalCategoryId.slice(3).trim();
  return finalCategoryId;
}
