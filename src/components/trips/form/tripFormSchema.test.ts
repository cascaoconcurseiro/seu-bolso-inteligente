import { describe, expect, it } from "vitest";
import { parseTripForm } from "./tripFormSchema";

const validForm = {
  name: "  Férias no Japão  ",
  destination: "  Tóquio, Japão ",
  notes: "  Comida, templos e tecnologia.  ",
  startDate: "2026-09-12",
  endDate: "2026-09-18",
  currency: "JPY",
  budget: "12500,50",
  coverImage: " https://images.example.com/japao.jpg ",
  memberIds: ["member-1"],
};

describe("parseTripForm", () => {
  it("normaliza um formulário válido sem fundir título e destino", () => {
    expect(parseTripForm(validForm)).toEqual({
      name: "Férias no Japão",
      destination: "Tóquio, Japão",
      notes: "Comida, templos e tecnologia.",
      start_date: "2026-09-12",
      end_date: "2026-09-18",
      currency: "JPY",
      budget: 12500.5,
      cover_image: "https://images.example.com/japao.jpg",
      memberIds: ["member-1"],
    });
  });

  it("aceita orçamento, descrição e capa vazios", () => {
    expect(
      parseTripForm({
        ...validForm,
        budget: "",
        notes: " ",
        coverImage: "",
      })
    ).toMatchObject({
      budget: null,
      notes: null,
      cover_image: null,
    });
  });

  it("rejeita data final anterior à inicial", () => {
    expect(() =>
      parseTripForm({
        ...validForm,
        startDate: "2026-09-18",
        endDate: "2026-09-12",
      })
    ).toThrow("A data final não pode ser anterior à inicial");
  });

  it("rejeita valores negativos e moeda não suportada", () => {
    expect(() => parseTripForm({ ...validForm, budget: "-1" })).toThrow(
      "O orçamento não pode ser negativo"
    );
    expect(() => parseTripForm({ ...validForm, currency: "INVALID" })).toThrow(
      "Selecione uma moeda válida"
    );
  });

  it("rejeita orçamento textual e remove participantes duplicados", () => {
    expect(() => parseTripForm({ ...validForm, budget: "abc" })).toThrow(
      "Informe um orçamento válido"
    );
    expect(
      parseTripForm({ ...validForm, memberIds: ["member-1", "member-1", "member-2"] }).memberIds
    ).toEqual(["member-1", "member-2"]);
  });

  it("rejeita campos obrigatórios vazios depois do trim", () => {
    expect(() => parseTripForm({ ...validForm, name: " " })).toThrow("Dê um nome para a viagem");
    expect(() => parseTripForm({ ...validForm, destination: " " })).toThrow("Informe o destino");
  });
});
