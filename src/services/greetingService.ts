/**
 * Serviço de Saudações Personalizadas
 * 
 * Gera saudações amigáveis e variadas baseadas no horário do dia,
 * garantindo que não repita a mesma saudação no mesmo dia.
 */

// Saudações para diferentes períodos do dia
const morningGreetings = [
  "Bom dia, {name}! ☀️ Que tal começar o dia organizando suas finanças?",
  "Oi, {name}! 🌅 Mais um dia para conquistar seus objetivos financeiros!",
  "E aí, {name}! 🌞 Pronto pra mais um dia de controle total?",
  "Bom dia! 🌤️ {name}, suas finanças estão te esperando!",
  "Olá, {name}! ☕ Café e finanças em dia, combinação perfeita!",
  "Fala, {name}! 🌻 Vamos fazer desse dia um sucesso financeiro?",
  "Bom dia, {name}! 🎯 Foco nas metas hoje!",
  "Oi, {name}! 🌈 Novo dia, novas oportunidades de economizar!",
  "E aí, {name}! 💪 Bora dominar as finanças hoje?",
  "Bom dia! 🚀 {name}, pronto pra decolar?",
];

const afternoonGreetings = [
  "Boa tarde, {name}! 🌤️ Como estão as finanças hoje?",
  "E aí, {name}! ☀️ Passando pra dar uma olhada nos números?",
  "Oi, {name}! 🎯 Tarde produtiva por aí?",
  "Fala, {name}! 💼 Hora de conferir como está o mês!",
  "Boa tarde! 📊 {name}, vamos analisar juntos?",
  "Olá, {name}! 🌻 Que bom te ver por aqui!",
  "E aí, {name}! 💰 Controlando os gastos como sempre?",
  "Boa tarde, {name}! 🎉 Suas finanças agradecem sua visita!",
  "Oi, {name}! 🌟 Tarde perfeita pra organizar as contas!",
  "Fala, {name}! 📈 Vamos ver como está o progresso?",
];

const eveningGreetings = [
  "Boa noite, {name}! 🌙 Fechando o dia com as contas em dia?",
  "E aí, {name}! 🌃 Hora de relaxar e conferir as finanças!",
  "Oi, {name}! ✨ Noite tranquila pra organizar tudo!",
  "Fala, {name}! 🌟 Que bom te ver antes de dormir!",
  "Boa noite! 🌜 {name}, vamos fazer um balanço do dia?",
  "Olá, {name}! 🎑 Noite perfeita pra planejar o amanhã!",
  "E aí, {name}! 💫 Conferindo os números antes de descansar?",
  "Boa noite, {name}! 🌠 Suas finanças estão em boas mãos!",
  "Oi, {name}! 🌌 Relaxa, suas contas estão organizadas!",
  "Fala, {name}! 🌛 Fechando o dia com chave de ouro?",
];

// Saudações especiais para dias específicos
const weekendGreetings = [
  "Opa, {name}! 🎉 Fim de semana é dia de planejar!",
  "E aí, {name}! 🏖️ Relaxando e organizando as finanças?",
  "Fala, {name}! 🎊 Aproveita o fim de semana pra se organizar!",
  "Oi, {name}! 🌴 Fim de semana produtivo por aí?",
  "Olá, {name}! 🎈 Que tal revisar os gastos da semana?",
];

const mondayGreetings = [
  "Oi, {name}! 💪 Segunda-feira, semana nova, metas novas!",
  "E aí, {name}! 🚀 Bora começar a semana com tudo?",
  "Fala, {name}! 🎯 Segunda é dia de foco total!",
  "Olá, {name}! ⚡ Energia renovada pra semana!",
  "Opa, {name}! 🌟 Segunda-feira com as finanças em dia!",
];

const fridayGreetings = [
  "Sextou, {name}! 🎉 Vamos fechar a semana bem?",
  "E aí, {name}! 🥳 Sexta-feira chegou!",
  "Fala, {name}! 🎊 Fim de semana chegando, finanças organizadas!",
  "Oi, {name}! 🌟 Sexta é dia de comemorar o controle!",
  "Opa, {name}! 🎈 Sextou com as contas em dia!",
];

/**
 * Obtém o período do dia atual
 */
function getPeriodOfDay(): 'morning' | 'afternoon' | 'evening' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Obtém o dia da semana
 */
function getDayOfWeek(): number {
  return new Date().getDay(); // 0 = domingo, 6 = sábado
}

/**
 * Gera uma chave única para o dia atual
 */
function getTodayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
}

/**
 * Obtém o índice da saudação usada hoje do localStorage
 */
function getUsedGreetingIndex(): number | null {
  const stored = localStorage.getItem('lastGreeting');
  if (!stored) return null;
  
  try {
    const data = JSON.parse(stored);
    if (data.date === getTodayKey()) {
      return data.index;
    }
  } catch {
    // Ignora erros de parse
  }
  
  return null;
}

/**
 * Salva o índice da saudação usada hoje
 */
function saveUsedGreetingIndex(index: number): void {
  localStorage.setItem('lastGreeting', JSON.stringify({
    date: getTodayKey(),
    index,
  }));
}

/**
 * Seleciona um índice aleatório diferente do usado hoje
 */
function getRandomIndex(arrayLength: number, excludeIndex: number | null): number {
  if (excludeIndex === null || arrayLength <= 1) {
    return Math.floor(Math.random() * arrayLength);
  }
  
  let newIndex;
  do {
    newIndex = Math.floor(Math.random() * arrayLength);
  } while (newIndex === excludeIndex && arrayLength > 1);
  
  return newIndex;
}

/**
 * Obtém a lista de saudações apropriada para o momento
 */
function getGreetingsList(): string[] {
  const dayOfWeek = getDayOfWeek();
  const period = getPeriodOfDay();
  
  // Dias especiais têm prioridade
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return weekendGreetings;
  }
  if (dayOfWeek === 1) {
    return mondayGreetings;
  }
  if (dayOfWeek === 5) {
    return fridayGreetings;
  }
  
  // Período do dia
  switch (period) {
    case 'morning':
      return morningGreetings;
    case 'afternoon':
      return afternoonGreetings;
    case 'evening':
      return eveningGreetings;
    default:
      return afternoonGreetings;
  }
}

/**
 * Gera uma saudação personalizada para o usuário
 */
export function getPersonalizedGreeting(userName: string): string {
  const greetings = getGreetingsList();
  const usedIndex = getUsedGreetingIndex();
  const newIndex = getRandomIndex(greetings.length, usedIndex);
  
  saveUsedGreetingIndex(newIndex);
  
  // Pega o primeiro nome
  const firstName = userName.split(' ')[0];
  
  return greetings[newIndex].replace('{name}', firstName);
}

/**
 * Obtém uma saudação simples sem nome (para fallback)
 */
export function getSimpleGreeting(): string {
  const period = getPeriodOfDay();
  
  switch (period) {
    case 'morning':
      return 'Bom dia! ☀️';
    case 'afternoon':
      return 'Boa tarde! 🌤️';
    case 'evening':
      return 'Boa noite! 🌙';
    default:
      return 'Olá! 👋';
  }
}

/**
 * Obtém o emoji do período do dia
 */
export function getPeriodEmoji(): string {
  const period = getPeriodOfDay();
  
  switch (period) {
    case 'morning':
      return '☀️';
    case 'afternoon':
      return '🌤️';
    case 'evening':
      return '🌙';
    default:
      return '👋';
  }
}
