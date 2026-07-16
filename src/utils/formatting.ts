export function normalizeBrazilianText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s\+]/g, "") // deixa apenas letras, números, espaços e + (ex: disney+)
    .replace(/\s+/g, " ") // remove espaços múltiplos
    .trim();
}
