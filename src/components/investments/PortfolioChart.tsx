import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Asset } from '@/types/database';

interface PortfolioChartProps {
  assets: Asset[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ASSET_TYPE_LABELS = {
  STOCK: 'Ações',
  BOND: 'Títulos',
  FUND: 'Fundos',
  CRYPTO: 'Criptomoedas',
  REAL_ESTATE: 'Imóveis',
  OTHER: 'Outros',
};

export const PortfolioChart = ({ assets }: PortfolioChartProps) => {
  // Agrupar por tipo
  const dataByType = assets.reduce((acc, asset) => {
    const value = (asset.quantity || 0) * (asset.current_price || 0);
    const type = asset.type;
    
    if (!acc[type]) {
      acc[type] = 0;
    }
    acc[type] += value;
    
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(dataByType).map(([type, value]) => ({
    name: ASSET_TYPE_LABELS[type as keyof typeof ASSET_TYPE_LABELS],
    value,
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) =>
              new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              }).format(value)
            }
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
