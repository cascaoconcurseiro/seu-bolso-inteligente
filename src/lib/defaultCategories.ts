// Categorias padrão hierárquicas para novos usuários
// Estrutura: Categoria Pai → Subcategorias

export interface CategoryDefinition {
  name: string;
  icon: string;
  type: "expense" | "income";
  children?: Omit<CategoryDefinition, "children">[];
}

export const DEFAULT_CATEGORIES: CategoryDefinition[] = [
  // ========== DESPESAS ==========
  
  {
    name: "Supermercado",
    icon: "🛒",
    type: "expense",
    children: [
      { name: "Feira", icon: "🥬", type: "expense" },
      { name: "Açougue", icon: "🥩", type: "expense" },
      { name: "Padaria", icon: "🥖", type: "expense" },
      { name: "Bebidas", icon: "🥤", type: "expense" },
      { name: "Higiene e Limpeza", icon: "🧼", type: "expense" }
    ],
  },
  
  {
    name: "Restaurantes e Lanches",
    icon: "🍽️",
    type: "expense",
    children: [
      { name: "Restaurante", icon: "🍽️", type: "expense" },
      { name: "Lanche", icon: "🍔", type: "expense" },
      { name: "Café", icon: "☕", type: "expense" },
      { name: "Bar", icon: "🍺", type: "expense" },
      { name: "Fast Food", icon: "🍟", type: "expense" }
    ],
  },

  {
    name: "Delivery",
    icon: "🍕",
    type: "expense",
    children: [
      { name: "Marmita", icon: "🍱", type: "expense" },
      { name: "Pizza", icon: "🍕", type: "expense" },
      { name: "Hamburguer", icon: "🍔", type: "expense" },
      { name: "Comida Japonesa", icon: "🍣", type: "expense" }
    ],
  },

  {
    name: "Gasolina",
    icon: "⛽",
    type: "expense",
    children: [
      { name: "Combustível", icon: "⛽", type: "expense" },
      { name: "Etanol", icon: "🌿", type: "expense" },
      { name: "Diesel", icon: "🚚", type: "expense" },
      { name: "GNV", icon: "🎈" , type: "expense"}
    ],
  },

  {
    name: "Transporte",
    icon: "🚗",
    type: "expense",
    children: [
      { name: "Uber/Taxi", icon: "🚕", type: "expense" },
      { name: "Ônibus", icon: "🚌", type: "expense" },
      { name: "Metrô", icon: "🚇", type: "expense" },
      { name: "Trem", icon: "🚆", type: "expense" },
      { name: "Estacionamento", icon: "🅿️", type: "expense" },
      { name: "Pedágio", icon: "🛣️", type: "expense" },
      { name: "Manutenção Veículo", icon: "🔧", type: "expense" },
      { name: "Lavagem", icon: "🚿", type: "expense" },
      { name: "IPVA", icon: "🚗", type: "expense" },
      { name: "Seguro Veículo", icon: "🛡️", type: "expense" },
      { name: "Licenciamento", icon: "📋", type: "expense" },
      { name: "Multas", icon: "🚨", type: "expense" },
      { name: "Financiamento Veículo", icon: "💳", type: "expense" }
    ],
  },
  
  {
    name: "Moradia",
    icon: "🏠",
    type: "expense",
    children: [
      { name: "Aluguel", icon: "🏠", type: "expense" },
      { name: "Condomínio", icon: "🏢", type: "expense" },
      { name: "Água", icon: "💧", type: "expense" },
      { name: "Luz", icon: "💡", type: "expense" },
      { name: "Gás", icon: "🔥", type: "expense" },
      { name: "Internet", icon: "🌐", type: "expense" },
      { name: "Telefone", icon: "📱", type: "expense" },
      { name: "TV a Cabo", icon: "📺", type: "expense" },
      { name: "IPTU", icon: "🏘️", type: "expense" },
      { name: "Manutenção", icon: "🔧", type: "expense" },
      { name: "Móveis", icon: "🛋️", type: "expense" },
      { name: "Decoração", icon: "🖼️", type: "expense" },
      { name: "Eletrodomésticos", icon: "🔌", type: "expense" },
      { name: "Limpeza", icon: "🧹", type: "expense" }
    ],
  },

  {
    name: "Contas e Assinaturas",
    icon: "📺",
    type: "expense",
    children: [
      { name: "Netflix", icon: "🎬", type: "expense" },
      { name: "Spotify", icon: "🎵", type: "expense" },
      { name: "Amazon Prime", icon: "📦", type: "expense" },
      { name: "Disney+", icon: "🏰", type: "expense" },
      { name: "HBO Max", icon: "🎭", type: "expense" },
      { name: "YouTube Premium", icon: "▶️", type: "expense" },
      { name: "Cloud Storage", icon: "☁️", type: "expense" },
      { name: "Lavanderia", icon: "🧺", type: "expense" },
      { name: "Costureira", icon: "🧵", type: "expense" },
      { name: "Encanador", icon: "🚰", type: "expense" },
      { name: "Eletricista", icon: "⚡", type: "expense" },
      { name: "Diarista", icon: "🧹", type: "expense" },
      { name: "Jardineiro", icon: "🌱", type: "expense" }
    ],
  },
  
  {
    name: "Saúde",
    icon: "💊",
    type: "expense",
    children: [
      { name: "Plano de Saúde", icon: "🏥", type: "expense" },
      { name: "Médico", icon: "👨‍⚕️", type: "expense" },
      { name: "Dentista", icon: "🦷", type: "expense" },
      { name: "Farmácia", icon: "💊", type: "expense" },
      { name: "Exames", icon: "🔬", type: "expense" },
      { name: "Cirurgia", icon: "🏥", type: "expense" },
      { name: "Fisioterapia", icon: "🧘", type: "expense" },
      { name: "Terapia", icon: "🧠", type: "expense" },
      { name: "Psicólogo", icon: "💭", type: "expense" },
      { name: "Óculos/Lentes", icon: "👓", type: "expense" },
      { name: "Aparelho Ortodôntico", icon: "😁", type: "expense" }
    ],
  },
  
  {
    name: "Educação",
    icon: "📚",
    type: "expense",
    children: [
      { name: "Mensalidade Escolar", icon: "🎓", type: "expense" },
      { name: "Mensalidade Faculdade", icon: "🏫", type: "expense" },
      { name: "Curso Online", icon: "💻", type: "expense" },
      { name: "Curso Presencial", icon: "📚", type: "expense" },
      { name: "Livros", icon: "📖", type: "expense" },
      { name: "Material Escolar", icon: "✏️", type: "expense" },
      { name: "Idiomas", icon: "🗣️", type: "expense" },
      { name: "Certificações", icon: "📜", type: "expense" },
      { name: "Uniforme", icon: "👔", type: "expense" }
    ],
  },
  
  {
    name: "Compras",
    icon: "🛍️",
    type: "expense",
    children: [
      { name: "Roupas", icon: "👕", type: "expense" },
      { name: "Calçados", icon: "👟", type: "expense" },
      { name: "Acessórios", icon: "👜", type: "expense" },
      { name: "Joias", icon: "💍", type: "expense" },
      { name: "Relógios", icon: "⌚", type: "expense" },
      { name: "Eletrônicos", icon: "📱", type: "expense" },
      { name: "Informática", icon: "💻", type: "expense" },
      { name: "Cosméticos", icon: "💄", type: "expense" },
      { name: "Perfumes", icon: "🌸", type: "expense" },
      { name: "Presentes", icon: "🎁", type: "expense" }
    ],
  },
  
  {
    name: "Lazer",
    icon: "🎮",
    type: "expense",
    children: [
      { name: "Cinema", icon: "🎬", type: "expense" },
      { name: "Teatro", icon: "🎭", type: "expense" },
      { name: "Shows", icon: "🎵", type: "expense" },
      { name: "Eventos", icon: "🎪", type: "expense" },
      { name: "Parque", icon: "🎡", type: "expense" },
      { name: "Viagem Lazer", icon: "🏖️", type: "expense" },
      { name: "Hobbies", icon: "🎨", type: "expense" },
      { name: "Jogos", icon: "🎮", type: "expense" },
      { name: "Esportes", icon: "⚽", type: "expense" },
      { name: "Academia", icon: "💪", type: "expense" },
      { name: "Clube", icon: "🏊", type: "expense" }
    ],
  },

  {
    name: "Viagens",
    icon: "✈️",
    type: "expense",
    children: [
      { name: "Passagem Aérea", icon: "✈️", type: "expense" },
      { name: "Passagem Rodoviária", icon: "🚌", type: "expense" },
      { name: "Hotel", icon: "🏨", type: "expense" },
      { name: "Hospedagem", icon: "🛏️", type: "expense" },
      { name: "Aluguel de Carro", icon: "🚗", type: "expense" },
      { name: "Turismo", icon: "🗺️", type: "expense" },
      { name: "Passeios", icon: "🎢", type: "expense" },
      { name: "Seguro Viagem", icon: "🛡️", type: "expense" },
      { name: "Visto", icon: "📋", type: "expense" }
    ],
  },

  {
    name: "Família e Pets",
    icon: "🐾",
    type: "expense",
    children: [
      { name: "Veterinário", icon: "🐕", type: "expense" },
      { name: "Ração", icon: "🦴", type: "expense" },
      { name: "Pet Shop", icon: "🐾", type: "expense" },
      { name: "Banho e Tosa", icon: "🛁", type: "expense" },
      { name: "Medicamentos Pet", icon: "💊", type: "expense" },
      { name: "Hotel Pet", icon: "🏨", type: "expense" }
    ],
  },
  
  {
    name: "Impostos e Taxas",
    icon: "📋",
    type: "expense",
    children: [
      { name: "IPTU", icon: "🏘️", type: "expense" },
      { name: "IPVA", icon: "🚗", type: "expense" },
      { name: "IR", icon: "💼", type: "expense" },
      { name: "Taxas Governamentais", icon: "🏛️", type: "expense" },
      { name: "Multas", icon: "🚨", type: "expense" }
    ],
  },

  {
    name: "Outros",
    icon: "📦",
    type: "expense",
    children: [
      { name: "Diversos", icon: "📦", type: "expense" },
      { name: "Emergência", icon: "🚨", type: "expense" }
    ],
  },

  // ========== RECEITAS ==========
  
  {
    name: "Trabalho",
    icon: "💼",
    type: "income",
    children: [
      { name: "Salário", icon: "💰", type: "income" },
      { name: "Freelance", icon: "💻", type: "income" },
      { name: "Bônus", icon: "🎯", type: "income" },
      { name: "Comissão", icon: "💼", type: "income" },
      { name: "13º Salário", icon: "💵", type: "income" },
      { name: "Férias", icon: "🏖️", type: "income" },
      { name: "Hora Extra", icon: "⏰", type: "income" },
      { name: "PLR", icon: "📊", type: "income" },
      { name: "Rescisão", icon: "📄", type: "income" },
    ],
  },
  
  {
    name: "Investimentos",
    icon: "📈",
    type: "income",
    children: [
      { name: "Dividendos", icon: "📈", type: "income" },
      { name: "Juros", icon: "💹", type: "income" },
      { name: "Rendimento Poupança", icon: "🏦", type: "income" },
      { name: "Rendimento CDB", icon: "📊", type: "income" },
      { name: "Venda de Ações", icon: "📊", type: "income" },
      { name: "Criptomoedas", icon: "₿", type: "income" },
      { name: "Fundos Imobiliários", icon: "🏢", type: "income" },
    ],
  },
  
  {
    name: "Renda Extra",
    icon: "💵",
    type: "income",
    children: [
      { name: "Aluguel Recebido", icon: "🏠", type: "income" },
      { name: "Venda", icon: "🏷️", type: "income" },
      { name: "Presente Recebido", icon: "🎁", type: "income" },
      { name: "Reembolso", icon: "💳", type: "income" },
      { name: "Prêmio", icon: "🏆", type: "income" },
      { name: "Cashback", icon: "💰", type: "income" },
      { name: "Pensão", icon: "👨‍👩‍👧", type: "income" },
      { name: "Aposentadoria", icon: "👴", type: "income" },
      { name: "Remessa Internacional", icon: "💸", type: "income" },
    ],
  },
  
  {
    name: "Sistema",
    icon: "⚙️",
    type: "income",
    children: [
      { name: "Saldo Inicial", icon: "💰", type: "income" },
      { name: "Acerto Financeiro", icon: "🤝", type: "income" },
      { name: "Ajuste", icon: "🔧", type: "income" },
      { name: "Conversão Cambial", icon: "💱", type: "income" },
      { name: "Ajuste de Saldo", icon: "⚖️", type: "income" },
    ],
  },
  
  {
    name: "Outros",
    icon: "💵",
    type: "income",
    children: [
      { name: "Diversos", icon: "💵", type: "income" },
    ],
  },
];
