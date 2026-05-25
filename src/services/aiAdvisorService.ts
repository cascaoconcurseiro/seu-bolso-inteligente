import { CategoryPrediction } from "@/types/categoryPrediction";

const GROQ_API_URL = "/api/ai";

// Interfaces para os relatórios
export interface FinancialReportData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  savingsRate: number;
  currency: string;
  topCategories: { category: string; value: number }[];
  largestExpense: { description: string; amount: number } | null;
  periodLabel: string;
  viewType: 'MONTH' | 'YEAR';
}

// --- ESTRUTURA PARA MAPEAMENTO DETERMINÍSTICO BRASILEIRO ---
interface LocalMapping {
  keywords: string[];
  suggestion: string;
  categoryMatch: string; // Termo normalizado da categoria alvo
  type: 'receita' | 'despesa';
}

// Dicionário exaustivo sintonizado na realidade de consumo brasileira
const LOCAL_BRAZILIAN_MAPPINGS: LocalMapping[] = [
  // --- DESPESAS: DELIVERY ---
  {
    keywords: ["uber eats", "ubereats", "uber eat", "ubereat"],
    suggestion: "Uber Eats",
    categoryMatch: "delivery",
    type: "despesa"
  },
  {
    keywords: ["ifood", "ifod", "ifood eats", "ifood com", "ifod com"],
    suggestion: "iFood",
    categoryMatch: "delivery",
    type: "despesa"
  },
  {
    keywords: ["rappi", "rapi", "rapil"],
    suggestion: "Rappi",
    categoryMatch: "delivery",
    type: "despesa"
  },
  {
    keywords: ["ze delivery", "ze da cerveja", "ze cerveja", "zedelivery"],
    suggestion: "Zé Delivery",
    categoryMatch: "delivery",
    type: "despesa"
  },
  {
    keywords: ["aiqfome", "aiq fome"],
    suggestion: "Aiqfome",
    categoryMatch: "delivery",
    type: "despesa"
  },
  {
    keywords: ["tele entrega", "teleentrega", "telepizza", "tele pizza", "delivery burguer", "delivery pizza", "tele-entrega"],
    suggestion: "Tele-entrega",
    categoryMatch: "delivery",
    type: "despesa"
  },

  // --- DESPESAS: TRANSPORTE ---
  {
    keywords: ["uber", "ubr", "uuber", "uber trip", "uber taxi", "uberx", "uber comfort"],
    suggestion: "Uber",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["99pop", "99 pop", "99", "99 taxi", "99app", "99run", "99moto"],
    suggestion: "99",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["taxi", "taxis", "taxista"],
    suggestion: "Táxi",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["cabify", "cabifai"],
    suggestion: "Cabify",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["metro", "subway metro", "passagem metro", "bilhete metro"],
    suggestion: "Metrô",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["onibus", "tarifa onibus", "passagem onibus", "circular"],
    suggestion: "Ônibus",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["trem", "passagem trem", "ferrovia", "cptm", "supervia"],
    suggestion: "Trem",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["riocard", "rio card"],
    suggestion: "RioCard",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["bilhete unico", "bilheteunico", "sptrans"],
    suggestion: "Bilhete Único",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["passe facil", "passefacil"],
    suggestion: "Passe Fácil",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["pedagio", "pedagios", "tarifa pedagio"],
    suggestion: "Pedágio",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["sem parar", "semparar"],
    suggestion: "Sem Parar",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["conectcar", "conect car"],
    suggestion: "ConectCar",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["veloe", "veloi"],
    suggestion: "Veloe",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["estacionamento", "estac", "valet", "garagem"],
    suggestion: "Estacionamento",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["zona azul", "zonaazul", "cartao zona azul"],
    suggestion: "Zona Azul",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["mecanico", "mecanica", "oficina", "oficina mecanica", "auto center", "autocenter", "conserto carro", "funilaria", "funileiro", "pintura carro", "parachoque", "pastilha freio", "conserto motor"],
    suggestion: "Oficina Mecânica",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["pneu", "pneus", "borracharia", "borracheiro", "vulcanizacao", "alinhamento", "balanceamento"],
    suggestion: "Borracharia (Pneus)",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["autopecas", "auto pecas", "pecas carro", "acessorios carro"],
    suggestion: "Autopeças",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["seguro carro", "seguro auto", "porto seguro", "seguro veiculo"],
    suggestion: "Seguro Auto",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["ipva", "ipva pago", "ipva carro", "ipva moto"],
    suggestion: "IPVA",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["licenciamento", "taxa licenciamento", "dpvat"],
    suggestion: "Licenciamento",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["lavajato", "lava jato", "lavagem", "lavagem carro", "estetica automotiva", "ducha"],
    suggestion: "Lava Jato",
    categoryMatch: "transporte",
    type: "despesa"
  },
  {
    keywords: ["carro", "craro", "veiculo", "moto", "motocicleta"],
    suggestion: "Carro",
    categoryMatch: "transporte",
    type: "despesa"
  },

  // --- DESPESAS: GASOLINA ---
  {
    keywords: ["combustivel", "combust", "abastecimento", "gasola", "gasolina"],
    suggestion: "Gasolina",
    categoryMatch: "gasolina",
    type: "despesa"
  },
  {
    keywords: ["etanol", "alcool", "alco"],
    suggestion: "Etanol",
    categoryMatch: "gasolina",
    type: "despesa"
  },
  {
    keywords: ["diesel", "oleo diesel"],
    suggestion: "Diesel",
    categoryMatch: "gasolina",
    type: "despesa"
  },
  {
    keywords: ["gnv", "gas natural veicular"],
    suggestion: "GNV",
    categoryMatch: "gasolina",
    type: "despesa"
  },
  {
    keywords: ["posto", "postos"],
    suggestion: "Posto de Combustível",
    categoryMatch: "gasolina",
    type: "despesa"
  },
  {
    keywords: ["ipiranga", "posto ipiranga", "ampm", "am pm"],
    suggestion: "Posto Ipiranga",
    categoryMatch: "gasolina",
    type: "despesa"
  },
  {
    keywords: ["shell", "posto shell", "shell box", "shellbox"],
    suggestion: "Posto Shell",
    categoryMatch: "gasolina",
    type: "despesa"
  },
  {
    keywords: ["petrobras", "brmania", "posto br", "br mania"],
    suggestion: "Posto Petrobras",
    categoryMatch: "gasolina",
    type: "despesa"
  },
  {
    keywords: ["ale", "posto ale"],
    suggestion: "Posto ALE",
    categoryMatch: "gasolina",
    type: "despesa"
  },

  // --- DESPESAS: RESTAURANTES E LANCHES ---
  {
    keywords: ["mcdonalds", "mcdonald", "mc donalds", "mequi", "mc", "mc dia feliz"],
    suggestion: "McDonald's",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["burger king", "burgerking", "bk", "b king"],
    suggestion: "Burger King",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["subway", "sabuei"],
    suggestion: "Subway",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["starbucks", "starbuck", "cafe starbucks"],
    suggestion: "Starbucks",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["habibs", "habib", "habibis"],
    suggestion: "Habib's",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["pizza hut", "pizzahut"],
    suggestion: "Pizza Hut",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["dominos", "domino", "dominos pizza"],
    suggestion: "Domino's Pizza",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["bacio di latte", "bacio"],
    suggestion: "Bacio di Latte",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["cacau show", "cacaushow"],
    suggestion: "Cacau Show",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["kopenhagen", "copenhagen"],
    suggestion: "Kopenhagen",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["coco bambu", "cocobambu"],
    suggestion: "Coco Bambu",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["outback", "outback steakhouse"],
    suggestion: "Outback",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["madero", "madeiro"],
    suggestion: "Madero",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["giraffas", "girafas"],
    suggestion: "Giraffas",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["bobs", "bob"],
    suggestion: "Bob's",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["almoco", "jantar", "refeicao", "comida", "prato feito", "pf", "comercial", "marmita", "marmitex"],
    suggestion: "Almoço",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["restaurante", "churrascaria", "rodizio", "pizzaria", "sushi", "temaki", "hamburgueria", "lanchonete", "pastelaria", "doceria", "sorveteria"],
    suggestion: "Restaurante",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["barzinho", "bar", "chopp", "cerveja", "churras", "boteco", "pub", "adega"],
    suggestion: "Barzinho & Lazer",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["cafe", "cafeteria", "padoca", "pao de queijo", "expresso"],
    suggestion: "Café",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },
  {
    keywords: ["pastel", "dogao", "cachorro quente", "xis", "sorvete", "lanche", "salgado"],
    suggestion: "Lanche",
    categoryMatch: "restaurantes e lanches",
    type: "despesa"
  },

  // --- DESPESAS: SUPERMERCADO ---
  {
    keywords: ["pao", "pao frances", "pão", "cacetinho", "pao de sal", "bisnaguinha"],
    suggestion: "Pão (Padaria)",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["leite", "queijo", "presunto", "margarina", "manteiga", "requeijao", "iogurte", "frios"],
    suggestion: "Laticínios e Frios",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["mercado", "supermercado", "hipermercado", "minimercado", "compras casa", "feira", "sacolao", "hortifruti", "frutaria", "acougue", "mercearia"],
    suggestion: "Supermercado",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["carrefour", "carrefur"],
    suggestion: "Carrefour",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["pao de acucar", "paodeacucar"],
    suggestion: "Pão de Açúcar",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["extra", "extra supermercado", "mini extra"],
    suggestion: "Supermercado Extra",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["assai", "assai atacadista", "asai"],
    suggestion: "Assaí Atacadista",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["atacadao", "atacadao supermercados"],
    suggestion: "Atacadão",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["sams club", "sams", "samsclub"],
    suggestion: "Sam's Club",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["bourbon", "zaffari", "zafari"],
    suggestion: "Zaffari Bourbon",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["muffato", "super muffato", "mufato"],
    suggestion: "Muffato",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["guanabara", "supermercados guanabara"],
    suggestion: "Supermercados Guanabara",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["mundial", "supermercados mundial"],
    suggestion: "Supermercados Mundial",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["zona sul", "zona sul supermercados"],
    suggestion: "Supermercados Zona Sul",
    categoryMatch: "supermercado",
    type: "despesa"
  },
  {
    keywords: ["swift", "lojas swift", "carne swift"],
    suggestion: "Swift",
    categoryMatch: "supermercado",
    type: "despesa"
  },

  // --- DESPESAS: CONTAS E ASSINATURAS ---
  {
    keywords: ["netflix", "netflis"],
    suggestion: "Netflix",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["spotify", "spotifai"],
    suggestion: "Spotify",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["amazon prime", "prime video", "amazonprime"],
    suggestion: "Amazon Prime",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["disney plus", "disney", "disney+"],
    suggestion: "Disney+",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["hbo max", "hbo", "max hbo", "max streaming"],
    suggestion: "Max (HBO)",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["deezer", "dizer"],
    suggestion: "Deezer",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["youtube premium", "youtube sub", "youtube"],
    suggestion: "YouTube Premium",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["icloud", "icloud storage", "apple cloud"],
    suggestion: "iCloud",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["google one", "google storage", "google drive"],
    suggestion: "Google One",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["microsoft 365", "office 365", "onedrive"],
    suggestion: "Microsoft 365",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["playstation plus", "ps plus", "psn"],
    suggestion: "PlayStation Plus",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["xbox game pass", "game pass", "xbox live"],
    suggestion: "Xbox Game Pass",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["internet", "wifi", "wi fi", "banda larga", "virtua", "claro fibra", "vivo fibra", "tim ultra"],
    suggestion: "Internet Residencial",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["celular", "recarga", "recarga vivo", "recarga claro", "recarga tim", "vivo controle", "claro controle", "tim controle"],
    suggestion: "Plano de Celular",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },
  {
    keywords: ["tv a cabo", "sky", "sky tv", "claro tv"],
    suggestion: "TV a Cabo",
    categoryMatch: "contas e assinaturas",
    type: "despesa"
  },

  // --- DESPESAS: MORADIA ---
  {
    keywords: ["aluguel", "aluguel casa", "aluguel ap"],
    suggestion: "Aluguel",
    categoryMatch: "moradia",
    type: "despesa"
  },
  {
    keywords: ["condominio", "taxa condominio"],
    suggestion: "Condomínio",
    categoryMatch: "moradia",
    type: "despesa"
  },
  {
    keywords: ["iptu", "iptu parcelado"],
    suggestion: "IPTU",
    categoryMatch: "moradia",
    type: "despesa"
  },
  {
    keywords: ["luz", "energia", "energia eletrica", "enel", "light", "copel", "cemig", "neoenergia", "cpfl", "ceb", "equatorial"],
    suggestion: "Conta de Luz",
    categoryMatch: "moradia",
    type: "despesa"
  },
  {
    keywords: ["agua", "saneamento", "sabesp", "cedae", "copasa", "sanepar", "embasa", "cagece"],
    suggestion: "Conta de Água",
    categoryMatch: "moradia",
    type: "despesa"
  },
  {
    keywords: ["gas de cozinha", "botijao", "botijao gas", "congás", "gas canalizado"],
    suggestion: "Gás de Cozinha",
    categoryMatch: "moradia",
    type: "despesa"
  },
  {
    keywords: ["leroy merlin", "leroy", "telhanorte", "c&c", "casa e construcao", "deposito construcao", "material construcao", "obra", "reforma", "pintura casa", "tinta suvinil", "cimento", "tijolo"],
    suggestion: "Material de Construção",
    categoryMatch: "moradia",
    type: "despesa"
  },
  {
    keywords: ["faxina", "faxineira", "diarista", "limpeza casa"],
    suggestion: "Diarista / Faxina",
    categoryMatch: "moradia",
    type: "despesa"
  },

  // --- DESPESAS: COMPRAS ---
  {
    keywords: ["shopping", "compras shopping", "vestuario", "roupas", "roupa", "tenis", "sapato", "sapatilha", "calçado", "calçados", "mochila", "bolsa"],
    suggestion: "Compras e Roupas",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["zara", "renner", "c&a", "cea", "riachuelo", "marisa", "hering", "centauro", "decathlon", "arezzo", "schutz"],
    suggestion: "Roupas / Moda",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["americanas", "lojas americanas"],
    suggestion: "Lojas Americanas",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["magalu", "magazine luiza", "magazinedeluiza"],
    suggestion: "Magazine Luiza",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["casas bahia", "casasbahia"],
    suggestion: "Casas Bahia",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["ponto frio", "ponto"],
    suggestion: "Ponto",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["mercado livre", "mercadolivre", "mercado pago compra", "meli"],
    suggestion: "Mercado Livre",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["shopee", "shope", "chopi"],
    suggestion: "Shopee",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["aliexpress", "ali express", "alixpress"],
    suggestion: "AliExpress",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["amazon", "amazon.com", "amazon compra"],
    suggestion: "Amazon",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["shein", "sheing", "shein compra"],
    suggestion: "Shein",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["kabum", "pichau", "terabyte", "terabyteshop", "computador", "notebook", "celular", "iphone", "xiaomi", "samsung celular", "placa video", "teclado", "mouse", "eletronicos"],
    suggestion: "Eletrônicos & Tecnologia",
    categoryMatch: "compras",
    type: "despesa"
  },
  {
    keywords: ["boticario", "natura", "avon", "sephora", "perfume", "cosmeticos", "maquiagem", "rimel", "batom"],
    suggestion: "Cosméticos & Beleza",
    categoryMatch: "compras",
    type: "despesa"
  },

  // --- DESPESAS: SAÚDE ---
  {
    keywords: ["farmacia", "drogaria", "remedio", "remedios", "medicamento", "dorflex", "dipirona", "curativo", "farmaco"],
    suggestion: "Farmácia",
    categoryMatch: "saude",
    type: "despesa"
  },
  {
    keywords: ["drogasil", "droga raia", "drogaraia", "pague menos", "paguemenos", "pacheco", "drogaria pacheco", "sao paulo", "drogaria sao paulo", "panvel"],
    suggestion: "Drogaria / Farmácia",
    categoryMatch: "saude",
    type: "despesa"
  },
  {
    keywords: ["consulta", "medico", "consulta medica", "hospital", "clinica", "pediatra", "cardiologista", "ginecologista", "oftalmologista", "exame", "exames", "laboratorio", "laboratorio exames", "fleury", "delboni", "hermes pardini", "ultrassom", "raio x"],
    suggestion: "Serviços Médicos",
    categoryMatch: "saude",
    type: "despesa"
  },
  {
    keywords: ["dentista", "ortodontista", "clinica dentaria", "obturacao", "aparelho dente", "limpeza dente"],
    suggestion: "Dentista",
    categoryMatch: "saude",
    type: "despesa"
  },
  {
    keywords: ["psicologo", "terapia", "sessao terapia", "psicanalista", "psiquiatra"],
    suggestion: "Psicólogo & Terapia",
    categoryMatch: "saude",
    type: "despesa"
  },
  {
    keywords: ["academia", "smart fit", "smartfit", "bluefit", "musculacao", "treino", "pilates", "crossfit", "natacao"],
    suggestion: "Academia",
    categoryMatch: "saude",
    type: "despesa"
  },
  {
    keywords: ["plano de saude", "convenio", "convenio medico", "unimed", "amil", "sulamerica", "bradesco saude"],
    suggestion: "Plano de Saúde",
    categoryMatch: "saude",
    type: "despesa"
  },

  // --- DESPESAS: EDUCAÇÃO ---
  {
    keywords: ["escola", "colegio", "mensalidade escolar", "matricula", "creche", "mensalidade creche"],
    suggestion: "Mensalidade Escolar",
    categoryMatch: "educacao",
    type: "despesa"
  },
  {
    keywords: ["faculdade", "universidade", "pós", "pos-graduacao", "mba", "pos", "vestibular"],
    suggestion: "Faculdade",
    categoryMatch: "educacao",
    type: "despesa"
  },
  {
    keywords: ["udemy", "hotmart", "alura", "coursera", "eduzz", "curso", "cursos", "curso ingles", "curso programacao", "idiomas"],
    suggestion: "Cursos & EAD",
    categoryMatch: "educacao",
    type: "despesa"
  },
  {
    keywords: ["livro didatico", "material escolar", "papelaria", "caderno", "estojo", "caneta", "mochila escolar"],
    suggestion: "Material Escolar",
    categoryMatch: "educacao",
    type: "despesa"
  },

  // --- DESPESAS: LAZER ---
  {
    keywords: ["cinema", "cinemark", "uci", "playarte", "kinoplex", "ingresso cinema", "pipoca cinema"],
    suggestion: "Cinema",
    categoryMatch: "lazer",
    type: "despesa"
  },
  {
    keywords: ["teatro", "show", "ingresso", "sympla", "eventim", "ticket360", "ingresso rapido", "lollapalooza", "rock in rio"],
    suggestion: "Shows & Eventos",
    categoryMatch: "lazer",
    type: "despesa"
  },
  {
    keywords: ["balada", "festa", "clube", "rave", "danceteria", "noitada"],
    suggestion: "Lazer & Noite",
    categoryMatch: "lazer",
    type: "despesa"
  },
  {
    keywords: ["steam", "epic games", "epicgames", "nintendo eshop", "playstation store", "jogos", "jogo", "game", "games", "riot points", "vbucks"],
    suggestion: "Jogos & Entretenimento",
    categoryMatch: "lazer",
    type: "despesa"
  },

  // --- DESPESAS: VIAGENS ---
  {
    keywords: ["hotel", "pousada", "hostel", "motel", "aluguel temporada", "airbnb", "air bnb"],
    suggestion: "Hospedagem",
    categoryMatch: "viagens",
    type: "despesa"
  },
  {
    keywords: ["passagem aerea", "passagem aviao", "voo", "decolar", "booking", "booking.com", "123 milhas", "hurb", "cvc", "viajanet", "latam", "gol", "azul linhas"],
    suggestion: "Passagens Aéreas",
    categoryMatch: "viagens",
    type: "despesa"
  },
  {
    keywords: ["passagem onibus", "passagem rodoviaria", "buser", "clickbus", "rodoviaria"],
    suggestion: "Passagem de Ônibus",
    categoryMatch: "viagens",
    type: "despesa"
  },
  {
    keywords: ["localiza", "movida", "unidas", "aluguel carro viagem", "rentcars"],
    suggestion: "Aluguel de Carro",
    categoryMatch: "viagens",
    type: "despesa"
  },
  {
    keywords: ["dolar", "euro", "casa de cambio", "cambio", "moeda estrangeira", "nomad", "wise"],
    suggestion: "Câmbio / Viagem",
    categoryMatch: "viagens",
    type: "despesa"
  },

  // --- DESPESAS: FAMÍLIA E PETS ---
  {
    keywords: ["petshop", "pet shop", "cobasi", "petz", "racao", "racao gato", "racao cachorro", "pet", "pets", "banho e tosa", "veterinario", "consulta veterinaria", "remedio pet", "antipulgas"],
    suggestion: "Pet Shop",
    categoryMatch: "familia e pets",
    type: "despesa"
  },
  {
    keywords: ["fralda", "fraldas", "pampers", "huggies", "leite em po", "aptamil", "nestogeno", "chupeta", "mamadeira", "itens bebe", "creche bebe"],
    suggestion: "Cuidados com Bebê",
    categoryMatch: "familia e pets",
    type: "despesa"
  },
  {
    keywords: ["mesada", "mesada filhos"],
    suggestion: "Mesada",
    categoryMatch: "familia e pets",
    type: "despesa"
  },
  {
    keywords: ["pensao alimenticia", "pensao filho"],
    suggestion: "Pensão Alimentícia",
    categoryMatch: "familia e pets",
    type: "despesa"
  },

  // --- DESPESAS: IMPOSTOS E TAXAS ---
  {
    keywords: ["darf", "das", "mei das", "das-mei", "imposto de renda", "receita federal", "irpf", "imposto", "impostos", "tributo"],
    suggestion: "Impostos",
    categoryMatch: "impostos e taxas",
    type: "despesa"
  },
  {
    keywords: ["tarifa bancaria", "anuidade", "anuidade cartao", "juros", "iof", "taxa banco", "tarifa conta", "juros cheque especial", "multa", "multa atraso", "multa transito"],
    suggestion: "Tarifas & Taxas",
    categoryMatch: "impostos e taxas",
    type: "despesa"
  },

  // ==========================================
  // --- RECEITAS: TRABALHO ---
  {
    keywords: ["salario", "salário", "pagamento salario", "prolabore", "pro-labore", "folha", "folha pagamento", "holerite"],
    suggestion: "Salário",
    categoryMatch: "trabalho",
    type: "receita"
  },
  {
    keywords: ["quinzena", "adiantamento", "adiantamento salarial", "vale"],
    suggestion: "Adiantamento Salarial",
    categoryMatch: "trabalho",
    type: "receita"
  },
  {
    keywords: ["13 salario", "decimo terceiro", "13o", "13o salario", "13º", "13º salário"],
    suggestion: "Décimo Terceiro",
    categoryMatch: "trabalho",
    type: "receita"
  },
  {
    keywords: ["ferias", "abono pecuniario", "ferias remuneradas"],
    suggestion: "Férias",
    categoryMatch: "trabalho",
    type: "receita"
  },
  {
    keywords: ["plr", "participacao lucros", "bonus", "bonificacao", "premio", "premiacao"],
    suggestion: "PLR / Bônus",
    categoryMatch: "trabalho",
    type: "receita"
  },
  {
    keywords: ["freelance", "freelancer", "freela", "job", "servico freela", "bico", "projeto"],
    suggestion: "Freelancer / Job",
    categoryMatch: "trabalho",
    type: "receita"
  },
  {
    keywords: ["prestacao servicos", "prestacao de servicos", "prestacao de servico", "consultoria", "honorarios", "honorario"],
    suggestion: "Prestação de Serviços",
    categoryMatch: "trabalho",
    type: "receita"
  },
  {
    keywords: ["venda comissao", "comissao", "comissao vendas"],
    suggestion: "Comissão de Vendas",
    categoryMatch: "trabalho",
    type: "receita"
  },

  // --- RECEITAS: INVESTIMENTOS ---
  {
    keywords: ["dividendos", "dividendo", "proventos dividendos"],
    suggestion: "Dividendos",
    categoryMatch: "investimentos",
    type: "receita"
  },
  {
    keywords: ["jcp", "juros sobre capital proprio"],
    suggestion: "Juros s/ Capital Próprio",
    categoryMatch: "investimentos",
    type: "receita"
  },
  {
    keywords: ["rendimento", "rendimento poupanca", "rendimentos", "rendimento cdb", "rendimento fundo", "nubank rendimento", "tesouro direto rendimento"],
    suggestion: "Rendimentos de Aplicação",
    categoryMatch: "investimentos",
    type: "receita"
  },
  {
    keywords: ["fii", "fiis", "fundos imobiliarios", "rendimento fii"],
    suggestion: "Proventos FIIs",
    categoryMatch: "investimentos",
    type: "receita"
  },
  {
    keywords: ["resgate", "resgate cdb", "resgate investimentos", "venda acoes", "resgate fundo"],
    suggestion: "Resgate de Investimento",
    categoryMatch: "investimentos",
    type: "receita"
  },
  {
    keywords: ["bitcoin", "btc", "cripto", "venda cripto", "lucro cripto"],
    suggestion: "Criptoativos",
    categoryMatch: "investimentos",
    type: "receita"
  },

  // --- RECEITAS: RENDA EXTRA ---
  {
    keywords: ["pix recebido", "pix amigo", "recebido pix", "pix mae", "pix pai", "transferencia recebida"],
    suggestion: "Pix Recebido",
    categoryMatch: "renda extra",
    type: "receita"
  },
  {
    keywords: ["venda usado", "desapego", "venda desapego", "enjoei", "olx", "brecho", "venda olx", "venda brecho"],
    suggestion: "Venda de Desapegos",
    categoryMatch: "renda extra",
    type: "receita"
  },
  {
    keywords: ["aluguel recebido", "aluguel ap recebido", "aluguel sala"],
    suggestion: "Aluguel Recebido",
    categoryMatch: "renda extra",
    type: "receita"
  },
  {
    keywords: ["presente", "presente aniversario", "pix aniversario", "dinheiro presente"],
    suggestion: "Presente / Doação",
    categoryMatch: "renda extra",
    type: "receita"
  },
  {
    keywords: ["reembolso", "reembolso despesa", "reembolso Uber", "reembolso corporativo", "estorno"],
    suggestion: "Reembolso",
    categoryMatch: "renda extra",
    type: "receita"
  },
  {
    keywords: ["cashback", "cash back", "meliuz", "ame cashback", "nubank cashback"],
    suggestion: "Cashback",
    categoryMatch: "renda extra",
    type: "receita"
  },
  {
    keywords: ["doacao", "ajuda financeira", "emprestimo recebido"],
    suggestion: "Ajuda / Doação",
    categoryMatch: "renda extra",
    type: "receita"
  },
  {
    keywords: ["lote", "loteria", "mega sena", "mega-sena", "premios", "premiacao recebida"],
    suggestion: "Premiação / Sorteio",
    categoryMatch: "renda extra",
    type: "receita"
  },
  {
    keywords: ["aposentadoria", "pensao recebida", "inss"],
    suggestion: "Aposentadoria / INSS",
    categoryMatch: "renda extra",
    type: "receita"
  },

  // --- RECEITAS: SISTEMA ---
  {
    keywords: ["saldo inicial", "aporte inicial", "abertura conta", "saldo abertura"],
    suggestion: "Saldo Inicial de Conta",
    categoryMatch: "sistema",
    type: "receita"
  },
  {
    keywords: ["ajuste", "ajuste saldo", "ajuste de saldo", "acerto", "acerto contabil"],
    suggestion: "Ajuste de Saldo",
    categoryMatch: "sistema",
    type: "receita"
  }
];

// Função utilitária de normalização sintonizada ao português brasileiro
function normalizeBrazilianText(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9\s\+]/g, "")   // deixa apenas letras, números, espaços e + (ex: disney+)
    .replace(/\s+/g, " ")            // remove espaços múltiplos
    .trim();
}

export class AIAdvisorService {
  /**
   * Pede para a IA gerar uma análise financeira baseada no histórico mensal ou anual.
   */
  static async analyzeFinancialPeriod(data: FinancialReportData): Promise<string> {
    const prompt = `
Você é o consultor financeiro IA oficial do app "Seu Bolso Inteligente".
O usuário está visualizando os relatórios do período: ${data.periodLabel} (${data.viewType === 'MONTH' ? 'Mensal' : 'Anual'}).

DADOS DO PERÍODO:
- Receitas Totais: ${data.currency} ${data.totalIncome.toFixed(2)}
- Despesas Totais: ${data.currency} ${data.totalExpense.toFixed(2)}
- Saldo Líquido: ${data.currency} ${data.balance.toFixed(2)}
- Taxa de Poupança (economia): ${data.savingsRate.toFixed(1)}%

Top Categorias de Gasto:
${data.topCategories.map(c => `- ${c.category}: ${data.currency} ${c.value.toFixed(2)}`).join('\n')}

${data.largestExpense ? `Maior Despesa Única: ${data.largestExpense.description} (${data.currency} ${data.largestExpense.amount.toFixed(2)})` : ''}

SUA MISSÃO:
1. Analise a saúde financeira do usuário neste período.
2. Seja MUITO conciso, direto e didático (tom de especialista de negócios e coach financeiro motivador).
3. Escreva pequenos parágrafos, formatados em Markdown. Use negrito para enfatizar coisas importantes.
4. Siga ESTRITAMENTE esta estrutura de tópicos (não use outras hashtags):
### Resumo
### Pontos Fortes
### Pontos de Atenção
### Plano de Ação

Não invente números, use apenas os dados acima. Se os dados estiverem todos zerados, diga que precisa de mais movimentações para gerar uma análise.
`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant", // Modelo econômico de baixo custo-benefício
          messages: [{ role: "system", content: prompt }],
          temperature: 0.5,
          max_tokens: 600,
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.choices[0].message.content || "Desculpe, não consegui formular um conselho agora.";
      }
      throw new Error(`API servidora retornou status ${response.status}`);
    } catch (error) {
      console.warn("[AIAdvisorService] Falha na chamada da API servidora para análise financeira. Tentando fallback direto no cliente...", error);
      const clientApiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (clientApiKey) {
        try {
          const directResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${clientApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [{ role: "system", content: prompt }],
              temperature: 0.5,
              max_tokens: 600,
            })
          });

          if (directResponse.ok) {
            const result = await directResponse.json();
            return result.choices[0].message.content || "Desculpe, não consegui formular um conselho agora.";
          }
        } catch (fallbackError) {
          console.error("[AIAdvisorService] Erro no fallback direto de análise financeira:", fallbackError);
        }
      }
      throw new Error("Falha ao se comunicar com a Inteligência Artificial.");
    }
  }

  /**
   * Pede para a IA prever o resto da palavra que o usuário está digitando e categorizá-la.
   */
  static async predictAutocompleteAndCategory(
    partialDescription: string,
    historicalDescriptions: string[],
    userCategories: { id: string; name: string }[]
  ): Promise<{ suggestion: string; categoryId: string | null }> {
    const sanitizedPartial = (partialDescription || "").trim().substring(0, 80);
    if (sanitizedPartial.length < 2) {
      return { suggestion: "", categoryId: null };
    }

    // --- ⚡ MOTOR HÍBRIDO DETERMINÍSTICO BRASILEIRO ---
    const normalizedInput = normalizeBrazilianText(sanitizedPartial);

    // 1. Identifica se a lista de categorias fornecida é de receita ou despesa
    const isReceitaList = userCategories.some(uc => {
      const name = normalizeBrazilianText(uc.name);
      return name.includes("trabalho") || name.includes("investimento") || name.includes("renda extra");
    });
    const targetType: 'receita' | 'despesa' = isReceitaList ? 'receita' : 'despesa';

    // 2. Busca exaustiva local priorizando keywords específicas longas (ex: "uber eats" antes de "uber")
    let bestMatch: LocalMapping | null = null;
    let longestKeywordLength = 0;

    for (const mapping of LOCAL_BRAZILIAN_MAPPINGS) {
      if (mapping.type !== targetType) continue; // Segregação rígida de fluxos!

      for (const keyword of mapping.keywords) {
        const normalizedKeyword = normalizeBrazilianText(keyword);
        
        // Verifica se:
        // A) A palavra digitada é exatamente igual ou começa igual à palavra mapeada (ex: "ube" -> "uber")
        // B) Ou se a palavra digitada contem a palavra mapeada isolada (ex: "uber para aeroporto" -> "uber")
        const isExactOrStarts = normalizedKeyword.startsWith(normalizedInput) || normalizedInput.startsWith(normalizedKeyword);
        const containsAsWord = new RegExp(`\\b${normalizedKeyword}\\b`).test(normalizedInput);

        if (isExactOrStarts || containsAsWord) {
          if (normalizedKeyword.length > longestKeywordLength) {
            longestKeywordLength = normalizedKeyword.length;
            bestMatch = mapping;
          }
        }
      }
    }

    if (bestMatch) {
      // Cruzamento local com o ID real da categoria cadastrada no banco do usuário
      const searchCat = bestMatch.categoryMatch;
      const matchedUserCategory = userCategories.find(uc => {
        const normUserCatName = normalizeBrazilianText(uc.name);
        return normUserCatName === searchCat || normUserCatName.includes(searchCat) || searchCat.includes(normUserCatName);
      });

      if (matchedUserCategory) {
        console.log(`[AIAdvisorService] ⚡ Match determinístico local brasileiro encontrado para "${sanitizedPartial}":`, {
          suggestion: bestMatch.suggestion,
          categoryId: matchedUserCategory.id,
          categoryName: matchedUserCategory.name
        });
        return {
          suggestion: bestMatch.suggestion,
          categoryId: matchedUserCategory.id
        };
      }
    }
    // --- ⚡ FIM DO MOTOR HÍBRIDO ---

    // 1. Truncamento rigoroso contra payloads abusivos ou anomalias (ex: base64, anexos)
    const uniqueHistory = Array.from(
      new Set(
        (historicalDescriptions || [])
          .map(d => (d || "").trim().substring(0, 50))
          .filter(d => d.length >= 2 && !d.startsWith("data:") && !d.includes(";base64"))
      )
    ).slice(0, 25); // Reduzimos para 25 itens para garantir segurança máxima de token e payload

    const sanitizedCategories = (userCategories || []).map(c => ({
      id: c.id,
      name: (c.name || "").trim().substring(0, 40)
    }));

    const categoryList = sanitizedCategories.map(c => `- Categoria: "${c.name}", ID: "${c.id}"`).join('\n');

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro", especialista em finanças pessoais do Brasil, embutida no teclado do app "Seu Bolso Inteligente".
O usuário começou a digitar uma transação (despesa ou receita): "${sanitizedPartial}"

Seu trabalho é:
1. ADIVINHAR A PALAVRA COMPLETA e CORRIGIR ERROS ORTOGRÁFICOS.
Exemplos de correção: "ifod" -> "iFood", "craro" -> "Carro", "gasola" -> "Gasolina", "mc donals" -> "McDonald's", "pgto" -> "Pagamento", "pao" -> "Pão", "sal" -> "Salário", "div" -> "Dividendos".
2. REGIONALISMOS E GÍRIAS BRASILEIRAS SÃO VÁLIDOS!
Abrace os regionalismos de todo o Brasil (especialmente Rio Grande do Sul, Nordeste, etc). Exemplos:
- "Cacetinho" (Pão), "Pão de sal", "Bergamota", "Churras", "Guri", "Pila" (Dinheiro).
3. SELECIONAR A MELHOR CATEGORIA COM MÁXIMA INTELIGÊNCIA E PRECISÃO FINANCEIRA:
Você DEVE escolher OBRIGATORIAMENTE uma categoria que conste na lista de categorias disponíveis abaixo!

Se a lista de categorias disponíveis abaixo contiver categorias de DESPESA (Supermercado, Transporte, Gasolina, etc), mapeie conforme as regras de DESPESA:
- "Supermercado": Compras do dia a dia, compras de mantimentos para casa, feira, hortifrúti, açougue, atacadões (Assaí, Sam's), mercados de bairro e compras básicas de PADARIA, como Pão, Cacetinho, Pão de Sal, Leite, Queijo e Margarina!
- "Restaurantes e Lanches": Comer fora, almoço de trabalho, jantares, barzinho, chopp, cafeterias (Starbucks), McDonald's, Burger King, lanchonetes, pastelarias, rodízios, sushis, xis, dogão, docerias, ou seja, lanches e refeições prontas para consumo local.
- "Delivery": Pedidos de comida pronta para entrega domiciliar exclusivamente através de aplicativos como iFood, Rappi, Uber Eats, Zé Delivery ou tele-entrega direta de pizzaria.
- "Gasolina": Abastecimento de veículo em postos de combustível (gasolina, álcool, diesel, GNV), Posto Ipiranga, Petrobras, Shell, etc.
- "Transporte": Qualquer gasto relacionado a locomoção urbana ou manutenção de veículos, como aplicativos de mobilidade (Uber, 99, táxi), transporte público (ônibus, metrô, trem), tarifas de pedágio, estacionamentos, lavagem, mecânico, pneu, seguro, IPVA, licenciamento, conserto e manutenção de carros/motos.
  * ATENÇÃO ABSOLUTA: A palavra isolada "Uber" é TRANSPORTE. A palavra "Uber Eats" (ou qualquer menção a comida no Uber) é DELIVERY. A palavra "Carro" isolada ou associada a peças e mecânica pertence obrigatoriamente a "Transporte"!
- "Moradia", "Contas e Assinaturas", "Saúde", "Educação", "Compras", "Lazer", "Viagens", "Família e Pets", "Impostos e Taxas", "Outros".

Se a lista de categorias disponíveis abaixo contiver apenas categorias de RECEITA (Trabalho, Investimentos, Renda Extra, Sistema, Outros), mapeie conforme as regras de RECEITA:
- "Trabalho": Ganhos vindos do emprego, salários, adiantamento salarial, pró-labore, horas extras, comissões, bônus corporativos, décimo terceiro (13º salário), férias e receitas de prestação de serviços como trabalhador autônomo, freelancers, "jobs" ou consultorias.
- "Investimentos": Receitas provenientes de aplicações financeiras, como dividendos de ações, juros sobre capital próprio (JCP), proventos de fundos imobiliários (FIIs), rendimentos de poupança, títulos de renda fixa (CDB, Tesouro Direto), resgate de investimentos e lucros com criptoativos.
- "Renda Extra": Ganhos esporádicos ou complementares, como aluguel recebido de imóveis, venda de bens usados (desapegos, brechós), prêmios, doações, heranças, pensão, aposentadoria, reembolsos de despesas, cashbacks de compras ou transferências recebidas (ex: PIX de amigos/familiares).
- "Sistema": Saldo inicial de contas, acertos contábeis ou ajustes manuais do sistema.
- "Outros": Receitas que de forma alguma se enquadrem nas opções anteriores.

EXEMPLOS EXPLICITOS DE MAPEAMENTO DIRETO (Mapeie sem hesitar):
[Para Despesas]
- "carro", "pneu", "mecanico", "oficina", "estacionamento", "pedagio", "lavagem", "seguro auto", "uber", "99pop" -> Categoria correspondente a "Transporte" (NUNCA supermercado!)
- "combustivel", "gasolina", "etanol", "diesel", "posto ipiranga", "shell" -> Categoria correspondente a "Gasolina"
- "pao", "cacetinho", "leite", "manteiga", "mercado", "supermercado", "sacolao", "feira" -> Categoria correspondente a "Supermercado"
- "mcdonalds", "burguer king", "starbucks", "almoço", "jantar", "rodizio", "churrascaria" -> Categoria correspondente a "Restaurantes e Lanches"
- "ifood", "rappi", "tele pizza", "delivery burguer", "uber eats" -> Categoria correspondente a "Delivery" (ATENÇÃO: Diferencie Uber de Uber Eats!)

[Para Receitas]
- "salario", "pagamento", "salário", "pro-labore", "quinzena", "freelance", "job", "prestacao de servicos" -> Categoria correspondente a "Trabalho"
- "dividendos", "juros cdb", "proventos", "rendimento poupança", "fii", "ações" -> Categoria correspondente a "Investimentos"
- "aluguel recebido", "venda desapego", "brechó", "pix amigo", "presente", "reembolso", "cashback" -> Categoria correspondente a "Renda Extra"

4. REGRA DE SOBREVIVÊNCIA E PROTEÇÃO DE FLUXO: É expressamente PROIBIDO sugerir uma categoria de despesa se a lista de categorias disponíveis só contiver categorias de receita, e vice-versa! Se você não tiver certeza de qual categoria escolher, escolha a categoria com nome "Outros" presente na lista de categorias disponíveis do usuário. NUNCA invente categorias fora da lista!

Histórico recente do usuário (use como base, mas corrija erros absurdos):
[${uniqueHistory.join(', ')}]

Categorias disponíveis no banco de dados do usuário:
${categoryList}

REGRA ESTILOSA OBRIGATÓRIA:
Retorne APENAS um JSON válido. É PROIBIDO retornar null para categoryId se houver qualquer categoria minimamente relacionada na lista. O valor de "categoryId" deve ser EXATAMENTE o ID correspondente da lista de categorias, sem adicionar prefixos como "ID:" ou "id:" e sem alterar a string.
{
  "suggestion": "Nome Formatado Corretamente",
  "categoryId": "id_da_categoria_mais_apropriada"
}
`;

    const requestBody = {
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
      response_format: { type: "json_object" }
    };

    const bodyString = JSON.stringify(requestBody);
    const bodySizeBytes = new Blob([bodyString]).size;

    console.log(`[AIAdvisorService] 🔌 RASTREAMENTO DE REQUISIÇÃO (Tamanho: ${bodySizeBytes} bytes / ${bodyString.length} chars):`, {
      partialDescription: sanitizedPartial,
      historyCount: uniqueHistory.length,
      categoriesCount: sanitizedCategories.length,
      first3History: uniqueHistory.slice(0, 3),
      categories: sanitizedCategories.map(c => c.name)
    });

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: bodyString
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AIAdvisorService] ❌ Erro na API Servidora (Status ${response.status}):`, {
          errorText,
          payloadSizeBytes: bodySizeBytes
        });
        throw new Error(`API servidora retornou status ${response.status} - ${errorText.substring(0, 200)}`);
      }

      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      
      let finalCategoryId = parsed.categoryId || null;
      if (finalCategoryId && typeof finalCategoryId === 'string') {
        finalCategoryId = finalCategoryId.trim().replace(/['"{}[:\]]/g, '').trim();
        if (finalCategoryId.toLowerCase().startsWith('id:')) finalCategoryId = finalCategoryId.slice(3).trim();
        else if (finalCategoryId.toLowerCase().startsWith('id-')) finalCategoryId = finalCategoryId.slice(3).trim();
        else if (finalCategoryId.toLowerCase().startsWith('id_')) finalCategoryId = finalCategoryId.slice(3).trim();
      }

      console.log(`[AIAdvisorService] ✅ Resposta da API Servidora decodificada com sucesso:`, {
        suggestion: parsed.suggestion,
        categoryId: finalCategoryId
      });

      return {
        suggestion: parsed.suggestion || "",
        categoryId: finalCategoryId
      };
    } catch (error: any) {
      console.warn(`[AIAdvisorService] ⚠️ Falha na chamada da API servidora para autocomplete (Tamanho do payload: ${bodySizeBytes} bytes). Iniciando fallback direto no cliente...`, error);
      
      const clientApiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!clientApiKey) {
        console.error("[AIAdvisorService] ❌ Fallback no cliente impossível: VITE_GROQ_API_KEY não está definida no ambiente do cliente!");
        return { suggestion: "", categoryId: null };
      }

      try {
        console.log(`[AIAdvisorService] 🔌 Iniciando requisição direta para a Groq (Fallback Cliente - Tamanho: ${bodySizeBytes} bytes)...`);
        const directResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${clientApiKey}`,
            'Content-Type': 'application/json',
          },
          body: bodyString
        });

        if (!directResponse.ok) {
          const errorText = await directResponse.text();
          console.error(`[AIAdvisorService] ❌ Erro no Fallback Direto da Groq (Status ${directResponse.status}):`, {
            errorText,
            payloadSizeBytes: bodySizeBytes
          });
          throw new Error(`Groq direto retornou status ${directResponse.status} - ${errorText.substring(0, 200)}`);
        }

        const result = await directResponse.json();
        const parsed = JSON.parse(result.choices[0].message.content);
        
        let finalCategoryId = parsed.categoryId || null;
        if (finalCategoryId && typeof finalCategoryId === 'string') {
          finalCategoryId = finalCategoryId.trim().replace(/['"{}[:\]]/g, '').trim();
          if (finalCategoryId.toLowerCase().startsWith('id:')) finalCategoryId = finalCategoryId.slice(3).trim();
          else if (finalCategoryId.toLowerCase().startsWith('id-')) finalCategoryId = finalCategoryId.slice(3).trim();
          else if (finalCategoryId.toLowerCase().startsWith('id_')) finalCategoryId = finalCategoryId.slice(3).trim();
        }

        console.log("[AIAdvisorService] ✅ Autocomplete via fallback direto na Groq concluído com sucesso!", {
          suggestion: parsed.suggestion,
          categoryId: finalCategoryId
        });
        
        return {
          suggestion: parsed.suggestion || "",
          categoryId: finalCategoryId
        };
      } catch (fallbackError: any) {
        console.error("[AIAdvisorService] ❌ Erro crítico no fallback direto de autocomplete:", fallbackError);
      }
      return { suggestion: "", categoryId: null };
    }
  }

  // --- MÉTODOS PARA VIAGENS (TRIP PLANNING) ---

  static async suggestTripShopping(destination: string, currency: string): Promise<Array<{ item: string; estimatedCost: number }>> {
    if (!destination) return [];

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro" especializada em viagens.
O usuário vai viajar para: "${destination}" e a moeda local da viagem é: "${currency}".
Sugira até 8 itens comuns que viajantes costumam COMPRAR (Shopping) nesse destino.
Pense no que as pessoas mais gastam nesse local (souvenirs típicos, comidas locais que levam pra casa, eletrônicos se for Miami/Orlando, vinhos se for Paris/Mendoza, etc).
A estimativa de custo (estimatedCost) deve estar na moeda informada: ${currency}.

RETORNE APENAS UM JSON no seguinte formato, e nada mais:
{
  "suggestions": [
    { "item": "Nome do Item", "estimatedCost": 0.00 }
  ]
}`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.5,
          max_tokens: 300,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error("Falha ao comunicar com IA");
      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      return parsed.suggestions || [];
    } catch (error) {
      console.error("Erro na sugestão de compras da viagem:", error);
      return [];
    }
  }

  static async suggestTripItinerary(destination: string): Promise<Array<{ title: string; location: string; description: string; durationHours: number }>> {
    if (!destination) return [];

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro" especializada em roteiros turísticos.
O usuário vai viajar para: "${destination}".
Sugira até 6 passeios ou atividades imperdíveis nesse destino.

RETORNE APENAS UM JSON no seguinte formato, e nada mais:
{
  "suggestions": [
    { 
      "title": "Nome do Passeio", 
      "location": "Local exato/Endereço", 
      "description": "Breve descrição do que fazer lá",
      "durationHours": 2 // Estimativa de duração em horas
    }
  ]
}`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.4,
          max_tokens: 600,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error("Falha ao comunicar com IA");
      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      return parsed.suggestions || [];
    } catch (error) {
      console.error("Erro na sugestão de roteiro da viagem:", error);
      return [];
    }
  }

  static async suggestTripChecklist(destination: string): Promise<Array<{ item: string; category: string }>> {
    if (!destination) return [];

    const prompt = `
Você é a inteligência artificial "Arquiteto Financeiro" especializada em organização de viagens.
O usuário vai viajar para: "${destination}".
Crie um checklist de até 10 itens fundamentais para esta viagem específica.
Lembre-se das necessidades climáticas e burocráticas do destino (ex: Passaporte e Visto se for internacional, casaco pesado se for neve, protetor solar se for praia).
Categorias permitidas: documentos, roupas, higiene, eletronicos, remedios, outros.

RETORNE APENAS UM JSON no seguinte formato, e nada mais:
{
  "suggestions": [
    { "item": "Nome do Item", "category": "documentos" }
  ]
}`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: prompt }],
          temperature: 0.3,
          max_tokens: 400,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) throw new Error("Falha ao comunicar com IA");
      const result = await response.json();
      const parsed = JSON.parse(result.choices[0].message.content);
      return parsed.suggestions || [];
    } catch (error) {
      console.error("Erro na sugestão de checklist da viagem:", error);
      return [];
    }
  }
}
