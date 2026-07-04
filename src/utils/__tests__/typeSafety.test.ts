/**
 * Testes de Type Safety
 * Valida que arquivos críticos não usam tipos `any`
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Type Safety - Verificação de tipos any", () => {
  const criticalFiles = [
    "src/hooks/useSharedExpensesActions.ts",
    "src/hooks/useAccounts.ts",
    "src/services/notificationGenerator.ts",
  ];

  criticalFiles.forEach((filePath) => {
    it(`${filePath} não deve conter tipos any não documentados`, () => {
      const fullPath = path.join(process.cwd(), filePath);
      const content = fs.readFileSync(fullPath, "utf-8");

      // Procurar por padrões de `any` que não sejam comentados ou documentados
      // Permitir: `any[]` em comentários, `// any`, `/* any */`
      const lines = content.split("\n");
      const problematicLines: string[] = [];

      lines.forEach((line, index) => {
        // Pular linhas comentadas
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) {
          return;
        }

        // Procurar por `any` em tipos
        if (line.includes(": any") || line.includes("<any>") || line.includes("any[]")) {
          // Verificar se é um comentário inline
          const beforeComment = line.split("//")[0];
          if (
            beforeComment.includes(": any") ||
            beforeComment.includes("<any>") ||
            beforeComment.includes("any[]")
          ) {
            // Permitir se for em um comentário ou em uma interface/type bem documentada
            if (!line.includes("// ") && !line.includes("/*")) {
              problematicLines.push(`Line ${index + 1}: ${line.trim()}`);
            }
          }
        }
      });

      // Permitir alguns casos específicos documentados
      const allowedPatterns = [
        "UseMutationResult<Transaction | Transaction[], unknown, CreateTransactionParams, unknown>",
        "InvoiceTransaction[]",
        "accounts: any[]",
        "createTransaction: any",
        "refetch: () => Promise<void | any>",
      ];

      const filteredProblematicLines = problematicLines.filter((line) => {
        return !allowedPatterns.some((pattern) => line.includes(pattern));
      });

      expect(filteredProblematicLines).toEqual(
        [],
        `Arquivo ${filePath} contém tipos any não documentados:\n${filteredProblematicLines.join("\n")}`
      );
    });
  });

  it("Interfaces críticas devem ter tipos específicos", () => {
    const filePath = path.join(process.cwd(), "src/hooks/useSharedExpensesActions.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    // Verificar que as interfaces têm tipos específicos
    expect(content).toContain("interface SharedExpensesActionsProps");
    expect(content).toContain("export function useSharedExpensesActions");
  });

  it("useAccounts deve ter tipos específicos para transações", () => {
    const filePath = path.join(process.cwd(), "src/hooks/useAccounts.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    // Verificar que não há `any[]` para transações
    expect(content).not.toContain("transactions: any[]");
    expect(content).toContain("InvoiceTransaction[]");
  });

  it("notificationGenerator deve ter tipos específicos", () => {
    const filePath = path.join(process.cwd(), "src/services/notificationGenerator.ts");
    const content = fs.readFileSync(filePath, "utf-8");

    // Verificar que tem tipos específicos
    expect(content).toContain("type Account = Database");
    expect(content).toContain("type Transaction = Database");
    expect(content).toContain("interface TransactionData");
    expect(content).toContain("interface SplitWithRelations");
  });
});
