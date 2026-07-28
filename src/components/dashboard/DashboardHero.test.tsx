import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DashboardHero } from "./DashboardHero";

vi.mock("@/contexts/PrivacyContext", () => ({
  usePrivacy: () => ({ isPrivate: false }),
}));

// WealthEvolutionChart is lazy — mock it to avoid recharts in unit tests
vi.mock("./WealthEvolutionChart", () => ({
  default: () => <div data-testid="wealth-chart" />,
}));

const baseProps = {
  balance: 5000,
  income: 8000,
  expenses: 3000,
  currency: "BRL",
  formatCurrency: (v: number) => `R$ ${v.toFixed(2)}`,
};

describe("DashboardHero", () => {
  it("renders correctly with default props (snapshot)", () => {
    const { container } = render(<DashboardHero {...baseProps} />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("renders with wealth history and monthly budget (snapshot)", () => {
    const { container } = render(
      <DashboardHero
        {...baseProps}
        wealthHistory={[
          { month_label: "Jan", balance: 4000 },
          { month_label: "Fev", balance: 5000 },
        ]}
        monthlyBudget={7000}
        realTimeRate={5.2}
      />
    );
    expect(container.firstChild).toMatchSnapshot();
  });

  it("shows negative balance correctly (snapshot)", () => {
    const { container } = render(
      <DashboardHero {...baseProps} balance={-200} income={0} expenses={200} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
