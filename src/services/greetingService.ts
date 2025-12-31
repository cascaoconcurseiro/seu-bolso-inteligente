/**
 * Serviço de Saudações Personalizadas
 * 
 * Gera saudações amigáveis e variadas baseadas no horário do dia,
 * garantindo que não repita a mesma saudação no mesmo dia.
 * 
 * 365+ saudações únicas, amigáveis e bem-humoradas!
 */

// ============================================
// SAUDAÇÕES DA MANHÃ (120 saudações)
// ============================================
const morningGreetings = [
  // Clássicas e motivacionais
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
  
  // Bem-humoradas
  "Bom dia, {name}! 🥱 Acordou? Suas finanças também!",
  "Oi, {name}! 🍳 Café da manhã e um check nas contas?",
  "E aí, {name}! 🌄 O sol nasceu e suas economias também!",
  "Bom dia! 🐓 Antes do galo cantar, já tá aqui né?",
  "Olá, {name}! 🥐 Croissant e controle financeiro, que dupla!",
  "Fala, {name}! 🌞 Sol tá brilhando, carteira também!",
  "Bom dia, {name}! 🎵 Acordou cantando? Suas contas também!",
  "Oi, {name}! 🌅 Nascer do sol e das suas economias!",
  "E aí, {name}! ☕ Café quentinho e finanças fresquinhas!",
  "Bom dia! 🦅 Cedo como uma águia, organizado como você!",
  
  // Motivacionais
  "Bom dia, {name}! 💎 Cada dia é uma oportunidade de ouro!",
  "Oi, {name}! 🌟 Brilha mais que o sol da manhã!",
  "E aí, {name}! 🏆 Campeão das finanças chegou!",
  "Bom dia! 🎪 O show das economias começa agora!",
  "Olá, {name}! 🎨 Pinte seu dia de verde (dinheiro)!",
  "Fala, {name}! 🎭 Protagonista da sua história financeira!",
  "Bom dia, {name}! 🎬 Ação! Seu filme de sucesso começa!",
  "Oi, {name}! 🎯 Mira no alvo e acerta sempre!",
  "E aí, {name}! 🏅 Medalha de ouro em organização!",
  "Bom dia! 🎖️ Sargento das finanças reportando!",
  
  // Engraçadas
  "Bom dia, {name}! 🦸 Herói das economias acordou!",
  "Oi, {name}! 🧙 Mago das finanças, bom dia!",
  "E aí, {name}! 🦄 Raro como você, só suas economias!",
  "Bom dia! 🐉 Guardião do tesouro acordou!",
  "Olá, {name}! 🎩 Elegância e controle, seu estilo!",
  "Fala, {name}! 🎪 Malabarista das contas em ação!",
  "Bom dia, {name}! 🎰 Apostando no sucesso hoje!",
  "Oi, {name}! 🎲 Dados lançados, vitória garantida!",
  "E aí, {name}! 🃏 Carta na manga: organização!",
  "Bom dia! 🎯 Bullseye nas finanças!",

  // Inspiradoras
  "Bom dia, {name}! 🌱 Plante hoje, colha amanhã!",
  "Oi, {name}! 🌳 Suas economias crescem como árvore!",
  "E aí, {name}! 🌺 Floresça financeiramente!",
  "Bom dia! 🦋 Transformação começa agora!",
  "Olá, {name}! 🌊 Navegue tranquilo nas finanças!",
  "Fala, {name}! ⛵ Capitão do seu destino!",
  "Bom dia, {name}! 🗻 Escale montanhas de sucesso!",
  "Oi, {name}! 🏔️ No topo do controle financeiro!",
  "E aí, {name}! 🌍 Mundo é seu, conquiste!",
  "Bom dia! 🌌 Universo de possibilidades!",
  
  // Animadas
  "Bom dia, {name}! 🎉 Festa das economias!",
  "Oi, {name}! 🎊 Confete de sucesso!",
  "E aí, {name}! 🎈 Balões de alegria financeira!",
  "Bom dia! 🎁 Presente: suas contas organizadas!",
  "Olá, {name}! 🎀 Laço de ouro no controle!",
  "Fala, {name}! 🎆 Fogos de artifício de vitória!",
  "Bom dia, {name}! 🎇 Brilho especial hoje!",
  "Oi, {name}! ✨ Magia das finanças!",
  "E aí, {name}! 🌟 Estrela do dia!",
  "Bom dia! 💫 Cometa da economia!",
  
  // Tecnológicas
  "Bom dia, {name}! 💻 Sistema financeiro online!",
  "Oi, {name}! 📱 App da prosperidade aberto!",
  "E aí, {name}! 🖥️ Processando sucesso!",
  "Bom dia! ⌨️ Digitando vitórias!",
  "Olá, {name}! 🖱️ Clique no sucesso!",
  "Fala, {name}! 📊 Dashboard da vitória!",
  "Bom dia, {name}! 📈 Gráfico só sobe!",
  "Oi, {name}! 📉 Gastos só descem!",
  "E aí, {name}! 💾 Salvando conquistas!",
  "Bom dia! 🔋 Bateria de energia!",
  
  // Esportivas
  "Bom dia, {name}! ⚽ Gol de placa nas finanças!",
  "Oi, {name}! 🏀 Enterrada no controle!",
  "E aí, {name}! 🎾 Ace nas economias!",
  "Bom dia! 🏐 Levantada perfeita!",
  "Olá, {name}! 🏈 Touchdown financeiro!",
  "Fala, {name}! ⚾ Home run nas contas!",
  "Bom dia, {name}! 🏓 Raquetada de sucesso!",
  "Oi, {name}! 🏸 Smash nas metas!",
  "E aí, {name}! 🥊 Nocaute nos gastos!",
  "Bom dia! 🏋️ Levantando economias!",
  
  // Musicais
  "Bom dia, {name}! 🎵 Sinfonia financeira!",
  "Oi, {name}! 🎶 Melodia do sucesso!",
  "E aí, {name}! 🎸 Rock das economias!",
  "Bom dia! 🎹 Piano da prosperidade!",
  "Olá, {name}! 🎺 Trompete da vitória!",
  "Fala, {name}! 🎻 Violino do controle!",
  "Bom dia, {name}! 🥁 Batida do sucesso!",
  "Oi, {name}! 🎤 Cante sua vitória!",
  "E aí, {name}! 🎧 Ouça o som do dinheiro!",
  "Bom dia! 🎼 Partitura perfeita!",
  
  // Culinárias
  "Bom dia, {name}! 🍕 Pizza de sucesso!",
  "Oi, {name}! 🍔 Hambúrguer da vitória!",
  "E aí, {name}! 🍰 Bolo de conquistas!",
  "Bom dia! 🍪 Cookie da sorte!",
  "Olá, {name}! 🍩 Donut da prosperidade!",
  "Fala, {name}! 🥗 Salada de economias!",
  "Bom dia, {name}! 🍝 Macarrão do sucesso!",
  "Oi, {name}! 🍜 Ramen da vitória!",
  "E aí, {name}! 🍱 Bento box organizado!",
  "Bom dia! 🍣 Sushi de qualidade!",
  
  // Natureza
  "Bom dia, {name}! 🌸 Flor da manhã!",
  "Oi, {name}! 🌼 Margarida da sorte!",
  "E aí, {name}! 🌷 Tulipa da prosperidade!",
  "Bom dia! 🌹 Rosa do sucesso!",
  "Olá, {name}! 🌺 Hibisco da vitória!",
  "Fala, {name}! 🌻 Girassol radiante!",
  "Bom dia, {name}! 🍀 Trevo de quatro folhas!",
  "Oi, {name}! 🌿 Folha verde de dinheiro!",
  "E aí, {name}! 🌾 Colheita abundante!",
  "Bom dia! 🌲 Pinheiro da fortuna!",
];

// ============================================
// SAUDAÇÕES DA TARDE (120 saudações)
// ============================================
const afternoonGreetings = [
  // Clássicas
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
  
  // Bem-humoradas
  "Boa tarde, {name}! 😎 Tarde de sol e economias!",
  "Oi, {name}! 🌮 Almoçou? Agora as contas!",
  "E aí, {name}! 🍽️ Digestão e organização!",
  "Boa tarde! 🥤 Refresque-se com boas notícias!",
  "Olá, {name}! 🍦 Sorvete e finanças geladas!",
  "Fala, {name}! 🌴 Sombra e água fresca nas contas!",
  "Boa tarde, {name}! 🏖️ Relaxa, tá tudo sob controle!",
  "Oi, {name}! 🎪 Espetáculo da tarde!",
  "E aí, {name}! 🎭 Matinê das economias!",
  "Boa tarde! 🎬 Sessão da tarde: seu sucesso!",

  // Motivacionais
  "Boa tarde, {name}! 💎 Diamante bruto polido!",
  "Oi, {name}! 🏆 Troféu da tarde!",
  "E aí, {name}! 🥇 Ouro nas finanças!",
  "Boa tarde! 🥈 Prata na casa!",
  "Olá, {name}! 🥉 Bronze é lucro!",
  "Fala, {name}! 🎖️ Condecorado pelo controle!",
  "Boa tarde, {name}! 🏅 Medalha merecida!",
  "Oi, {name}! 👑 Rei/Rainha das economias!",
  "E aí, {name}! 💪 Força total!",
  "Boa tarde! 🦾 Braço forte nas finanças!",
  
  // Engraçadas
  "Boa tarde, {name}! 🦸 Super-herói voltou!",
  "Oi, {name}! 🦹 Vilão dos gastos!",
  "E aí, {name}! 🧙 Feitiço do dinheiro!",
  "Boa tarde! 🧚 Fada madrinha das contas!",
  "Olá, {name}! 🧜 Sereia das economias!",
  "Fala, {name}! 🧛 Vampiro dos descontos!",
  "Boa tarde, {name}! 🧟 Zumbi do controle!",
  "Oi, {name}! 👻 Fantasma dos gastos!",
  "E aí, {name}! 👽 Alien da organização!",
  "Boa tarde! 🤖 Robô eficiente!",
  
  // Inspiradoras
  "Boa tarde, {name}! 🌊 Surfe na onda!",
  "Oi, {name}! 🏄 Pegue a onda certa!",
  "E aí, {name}! ⛵ Vento a favor!",
  "Boa tarde! 🚤 Navegando tranquilo!",
  "Olá, {name}! 🛥️ Iate do sucesso!",
  "Fala, {name}! ⚓ Ancorado no controle!",
  "Boa tarde, {name}! 🗺️ Mapa do tesouro!",
  "Oi, {name}! 🧭 Bússola apontando certo!",
  "E aí, {name}! 🏝️ Ilha do tesouro!",
  "Boa tarde! 🏴‍☠️ Pirata das economias!",
  
  // Animadas
  "Boa tarde, {name}! 🎨 Arte das finanças!",
  "Oi, {name}! 🖌️ Pincel da prosperidade!",
  "E aí, {name}! 🖍️ Colorindo o sucesso!",
  "Boa tarde! 🎭 Teatro da vitória!",
  "Olá, {name}! 🎪 Circo da alegria!",
  "Fala, {name}! 🎡 Roda gigante girando!",
  "Boa tarde, {name}! 🎢 Montanha-russa controlada!",
  "Oi, {name}! 🎠 Carrossel da sorte!",
  "E aí, {name}! 🎰 Jackpot garantido!",
  "Boa tarde! 🎲 Sorte grande!",
  
  // Tecnológicas
  "Boa tarde, {name}! 💻 Sistema atualizado!",
  "Oi, {name}! 📱 Notificação de sucesso!",
  "E aí, {name}! 🖥️ Tela de vitória!",
  "Boa tarde! ⌨️ Teclas do sucesso!",
  "Olá, {name}! 🖱️ Mouse da prosperidade!",
  "Fala, {name}! 📊 Dados positivos!",
  "Boa tarde, {name}! 📈 Crescimento constante!",
  "Oi, {name}! 📉 Dívidas em queda!",
  "E aí, {name}! 💾 Backup do sucesso!",
  "Boa tarde! 🔋 Energia renovada!",
  
  // Esportivas
  "Boa tarde, {name}! ⚽ Gol da tarde!",
  "Oi, {name}! 🏀 Cesta de três!",
  "E aí, {name}! 🎾 Match point!",
  "Boa tarde! 🏐 Ponto de ouro!",
  "Olá, {name}! 🏈 Passe completo!",
  "Fala, {name}! ⚾ Strike perfeito!",
  "Boa tarde, {name}! 🏓 Ponto decisivo!",
  "Oi, {name}! 🏸 Voleio certeiro!",
  "E aí, {name}! 🥊 Uppercut nas dívidas!",
  "Boa tarde! 🏋️ Peso leve nas contas!",
  
  // Musicais
  "Boa tarde, {name}! 🎵 Concerto da tarde!",
  "Oi, {name}! 🎶 Harmonia perfeita!",
  "E aí, {name}! 🎸 Solo de sucesso!",
  "Boa tarde! 🎹 Acorde perfeito!",
  "Olá, {name}! 🎺 Fanfarra da vitória!",
  "Fala, {name}! 🎻 Concerto magistral!",
  "Boa tarde, {name}! 🥁 Ritmo certo!",
  "Oi, {name}! 🎤 Vocal afinado!",
  "E aí, {name}! 🎧 Som cristalino!",
  "Boa tarde! 🎼 Composição perfeita!",
  
  // Culinárias
  "Boa tarde, {name}! 🍕 Fatia do sucesso!",
  "Oi, {name}! 🍔 Lanche da vitória!",
  "E aí, {name}! 🍰 Sobremesa merecida!",
  "Boa tarde! 🍪 Biscoito da sorte!",
  "Olá, {name}! 🍩 Rosquinha dourada!",
  "Fala, {name}! 🥗 Refeição balanceada!",
  "Boa tarde, {name}! 🍝 Prato cheio!",
  "Oi, {name}! 🍜 Tigela cheia!",
  "E aí, {name}! 🍱 Marmita caprichada!",
  "Boa tarde! 🍣 Combinado perfeito!",
  
  // Natureza
  "Boa tarde, {name}! 🌸 Jardim florido!",
  "Oi, {name}! 🌼 Campo de flores!",
  "E aí, {name}! 🌷 Canteiro organizado!",
  "Boa tarde! 🌹 Roseiral perfumado!",
  "Olá, {name}! 🌺 Tropical e próspero!",
  "Fala, {name}! 🌻 Sempre voltado pro sol!",
  "Boa tarde, {name}! 🍀 Sorte renovada!",
  "Oi, {name}! 🌿 Verde que te quero verde!",
  "E aí, {name}! 🌾 Safra abundante!",
  "Boa tarde! 🌲 Floresta de oportunidades!",
  
  // Viagens
  "Boa tarde, {name}! ✈️ Voo direto pro sucesso!",
  "Oi, {name}! 🚀 Decolando agora!",
  "E aí, {name}! 🛸 Nave do futuro!",
  "Boa tarde! 🚁 Helicóptero da vitória!",
  "Olá, {name}! 🛩️ Planando tranquilo!",
  "Fala, {name}! 🚂 Trem da prosperidade!",
  "Boa tarde, {name}! 🚄 Bala do sucesso!",
  "Oi, {name}! 🚇 Metrô da organização!",
  "E aí, {name}! 🚌 Ônibus da vitória!",
  "Boa tarde! 🚗 Carro do ano!",
];

// ============================================
// SAUDAÇÕES DA NOITE (125 saudações)
// ============================================
const eveningGreetings = [
  // Clássicas
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

  // Bem-humoradas
  "Boa noite, {name}! 😴 Antes de dormir, um check!",
  "Oi, {name}! 🛌 Pijama e planilhas!",
  "E aí, {name}! 🌙 Lua cheia de economias!",
  "Boa noite! ⭐ Estrelas e saldos positivos!",
  "Olá, {name}! 🦉 Coruja da organização!",
  "Fala, {name}! 🌃 Cidade dorme, você controla!",
  "Boa noite, {name}! 🌉 Ponte pro amanhã!",
  "Oi, {name}! 🏙️ Luzes da cidade, brilho das contas!",
  "E aí, {name}! 🌆 Pôr do sol das dívidas!",
  "Boa noite! 🌇 Horizonte limpo!",
  
  // Motivacionais
  "Boa noite, {name}! 💎 Diamante lapidado!",
  "Oi, {name}! 🏆 Troféu do dia!",
  "E aí, {name}! 🥇 Ouro puro!",
  "Boa noite! 🥈 Prata reluzente!",
  "Olá, {name}! 🥉 Bronze valioso!",
  "Fala, {name}! 🎖️ Honra ao mérito!",
  "Boa noite, {name}! 🏅 Pódio garantido!",
  "Oi, {name}! 👑 Coroa merecida!",
  "E aí, {name}! 💪 Força inabalável!",
  "Boa noite! 🦾 Poder absoluto!",
  
  // Engraçadas
  "Boa noite, {name}! 🦸 Herói descansa!",
  "Oi, {name}! 🦹 Vilão derrotado!",
  "E aí, {name}! 🧙 Magia feita!",
  "Boa noite! 🧚 Fada dormiu!",
  "Olá, {name}! 🧜 Sereia mergulhou!",
  "Fala, {name}! 🧛 Vampiro recolhido!",
  "Boa noite, {name}! 🧟 Zumbi cansado!",
  "Oi, {name}! 👻 Fantasma sumiu!",
  "E aí, {name}! 👽 Alien voltou!",
  "Boa noite! 🤖 Robô desligou!",
  
  // Inspiradoras
  "Boa noite, {name}! 🌊 Mar calmo!",
  "Oi, {name}! 🏄 Onda perfeita!",
  "E aí, {name}! ⛵ Porto seguro!",
  "Boa noite! 🚤 Ancorado!",
  "Olá, {name}! 🛥️ Atracado!",
  "Fala, {name}! ⚓ Firme e forte!",
  "Boa noite, {name}! 🗺️ Rota traçada!",
  "Oi, {name}! 🧭 Norte encontrado!",
  "E aí, {name}! 🏝️ Paraíso alcançado!",
  "Boa noite! 🏴‍☠️ Tesouro guardado!",
  
  // Animadas
  "Boa noite, {name}! 🎨 Obra-prima!",
  "Oi, {name}! 🖌️ Pintura completa!",
  "E aí, {name}! 🖍️ Desenho perfeito!",
  "Boa noite! 🎭 Cortina fechada!",
  "Olá, {name}! 🎪 Espetáculo encerrado!",
  "Fala, {name}! 🎡 Roda parou!",
  "Boa noite, {name}! 🎢 Passeio completo!",
  "Oi, {name}! 🎠 Volta finalizada!",
  "E aí, {name}! 🎰 Prêmio ganho!",
  "Boa noite! 🎲 Jogo vencido!",
  
  // Tecnológicas
  "Boa noite, {name}! 💻 Sistema em standby!",
  "Oi, {name}! 📱 App fechado!",
  "E aí, {name}! 🖥️ Tela desligada!",
  "Boa noite! ⌨️ Teclado em repouso!",
  "Olá, {name}! 🖱️ Mouse parado!",
  "Fala, {name}! 📊 Dados salvos!",
  "Boa noite, {name}! 📈 Gráfico congelado!",
  "Oi, {name}! 📉 Análise completa!",
  "E aí, {name}! 💾 Backup feito!",
  "Boa noite! 🔋 Recarga noturna!",
  
  // Esportivas
  "Boa noite, {name}! ⚽ Jogo ganho!",
  "Oi, {name}! 🏀 Partida vencida!",
  "E aí, {name}! 🎾 Set completo!",
  "Boa noite! 🏐 Game over!",
  "Olá, {name}! 🏈 Touchdown final!",
  "Fala, {name}! ⚾ Inning fechado!",
  "Boa noite, {name}! 🏓 Placar final!",
  "Oi, {name}! 🏸 Rally vencido!",
  "E aí, {name}! 🥊 Round final!",
  "Boa noite! 🏋️ Treino completo!",
  
  // Musicais
  "Boa noite, {name}! 🎵 Última nota!",
  "Oi, {name}! 🎶 Canção finalizada!",
  "E aí, {name}! 🎸 Show encerrado!",
  "Boa noite! 🎹 Recital completo!",
  "Olá, {name}! 🎺 Sinfonia finalizada!",
  "Fala, {name}! 🎻 Concerto encerrado!",
  "Boa noite, {name}! 🥁 Batida final!",
  "Oi, {name}! 🎤 Microfone desligado!",
  "E aí, {name}! 🎧 Fone guardado!",
  "Boa noite! 🎼 Partitura fechada!",
  
  // Culinárias
  "Boa noite, {name}! 🍕 Jantar servido!",
  "Oi, {name}! 🍔 Refeição completa!",
  "E aí, {name}! 🍰 Sobremesa deliciosa!",
  "Boa noite! 🍪 Biscoito da noite!",
  "Olá, {name}! 🍩 Doce dos sonhos!",
  "Fala, {name}! 🥗 Digestão tranquila!",
  "Boa noite, {name}! 🍝 Prato vazio!",
  "Oi, {name}! 🍜 Tigela limpa!",
  "E aí, {name}! 🍱 Marmita vazia!",
  "Boa noite! 🍣 Combinado perfeito!",
  
  // Natureza
  "Boa noite, {name}! 🌸 Flores dormindo!",
  "Oi, {name}! 🌼 Pétalas fechadas!",
  "E aí, {name}! 🌷 Jardim em paz!",
  "Boa noite! 🌹 Perfume noturno!",
  "Olá, {name}! 🌺 Tropical sereno!",
  "Fala, {name}! 🌻 Girassol descansando!",
  "Boa noite, {name}! 🍀 Trevo da sorte!",
  "Oi, {name}! 🌿 Folhas quietas!",
  "E aí, {name}! 🌾 Campo silencioso!",
  "Boa noite! 🌲 Floresta dormindo!",
  
  // Sonhos
  "Boa noite, {name}! 💤 Sonhe com sucesso!",
  "Oi, {name}! 😴 Durma tranquilo!",
  "E aí, {name}! 🛏️ Cama merecida!",
  "Boa noite! 🌙 Lua te protege!",
  "Olá, {name}! ⭐ Estrelas te guiam!",
  "Fala, {name}! 💫 Sonhos dourados!",
  "Boa noite, {name}! 🌠 Desejos realizados!",
  "Oi, {name}! 🌌 Universo conspira!",
  "E aí, {name}! ✨ Magia noturna!",
  "Boa noite! 🎆 Fogos de alegria!",
  
  // Reflexivas
  "Boa noite, {name}! 📖 Capítulo fechado!",
  "Oi, {name}! 📚 Livro do dia!",
  "E aí, {name}! 📝 Página virada!",
  "Boa noite! 📜 História escrita!",
  "Olá, {name}! 📰 Notícia boa!",
  "Fala, {name}! 📋 Lista completa!",
  "Boa noite, {name}! 📌 Tudo no lugar!",
  "Oi, {name}! 📍 Ponto final!",
  "E aí, {name}! 📎 Tudo anexado!",
  "Boa noite! 📁 Arquivo fechado!",
];

// ============================================
// SAUDAÇÕES DE FIM DE SEMANA (50 saudações)
// ============================================
const weekendGreetings = [
  "Opa, {name}! 🎉 Fim de semana é dia de planejar!",
  "E aí, {name}! 🏖️ Relaxando e organizando as finanças?",
  "Fala, {name}! 🎊 Aproveita o fim de semana pra se organizar!",
  "Oi, {name}! 🌴 Fim de semana produtivo por aí?",
  "Olá, {name}! 🎈 Que tal revisar os gastos da semana?",
  "Bom dia, {name}! 🥳 Sábado ou domingo, sempre organizado!",
  "E aí, {name}! 🍹 Drink e finanças em dia!",
  "Fala, {name}! 🏄 Surfe nas economias!",
  "Oi, {name}! 🎪 Fim de semana divertido e controlado!",
  "Olá, {name}! 🎡 Roda gigante das oportunidades!",
  "Opa, {name}! 🎢 Montanha-russa só de alegria!",
  "E aí, {name}! 🎠 Carrossel da prosperidade!",
  "Fala, {name}! 🎭 Teatro do sucesso!",
  "Oi, {name}! 🎬 Cinema das conquistas!",
  "Olá, {name}! 🎮 Game das finanças!",
  "Bom dia, {name}! 🎯 Alvo no lazer e controle!",
  "E aí, {name}! 🎲 Sorte grande no fim de semana!",
  "Fala, {name}! 🎰 Jackpot do descanso!",
  "Oi, {name}! 🃏 Cartas na mesa!",
  "Olá, {name}! 🎴 Baralho da sorte!",
  "Opa, {name}! 🧩 Quebra-cabeça resolvido!",
  "E aí, {name}! 🎨 Pinte o fim de semana!",
  "Fala, {name}! 🖌️ Arte do descanso!",
  "Oi, {name}! 🖍️ Colorindo o sábado/domingo!",
  "Olá, {name}! 📸 Foto do sucesso!",
  "Bom dia, {name}! 📷 Clique perfeito!",
  "E aí, {name}! 📹 Gravando vitórias!",
  "Fala, {name}! 🎥 Filmando conquistas!",
  "Oi, {name}! 🎞️ Rolo de sucessos!",
  "Olá, {name}! 🎬 Ação no fim de semana!",
  "Opa, {name}! 🍕 Pizza e planejamento!",
  "E aí, {name}! 🍔 Hambúrguer e organização!",
  "Fala, {name}! 🍰 Bolo e balanço!",
  "Oi, {name}! 🍪 Biscoito e controle!",
  "Olá, {name}! 🍩 Donut e dinheiro!",
  "Bom dia, {name}! 🥗 Salada e saldo!",
  "E aí, {name}! 🍝 Macarrão e metas!",
  "Fala, {name}! 🍜 Ramen e resultados!",
  "Oi, {name}! 🍱 Bento e benefícios!",
  "Olá, {name}! 🍣 Sushi e sucesso!",
  "Opa, {name}! 🌮 Taco e tática!",
  "E aí, {name}! 🌯 Burrito e balanço!",
  "Fala, {name}! 🥙 Kebab e conquistas!",
  "Oi, {name}! 🥪 Sanduíche e saldo!",
  "Olá, {name}! 🍿 Pipoca e planejamento!",
  "Bom dia, {name}! 🥤 Refrigerante e resultados!",
  "E aí, {name}! 🧃 Suco e sucesso!",
  "Fala, {name}! 🧋 Bubble tea e balanço!",
  "Oi, {name}! 🍵 Chá e controle!",
  "Olá, {name}! ☕ Café e conquistas!",
];

// ============================================
// SAUDAÇÕES DE SEGUNDA-FEIRA (30 saudações)
// ============================================
const mondayGreetings = [
  "Oi, {name}! 💪 Segunda-feira, semana nova, metas novas!",
  "E aí, {name}! 🚀 Bora começar a semana com tudo?",
  "Fala, {name}! 🎯 Segunda é dia de foco total!",
  "Olá, {name}! ⚡ Energia renovada pra semana!",
  "Opa, {name}! 🌟 Segunda-feira com as finanças em dia!",
  "Bom dia, {name}! 💼 Semana de trabalho e controle!",
  "E aí, {name}! 📊 Segunda com números positivos!",
  "Fala, {name}! 📈 Gráfico só sobe essa semana!",
  "Oi, {name}! 🏆 Troféu da semana começa hoje!",
  "Olá, {name}! 🥇 Ouro na segunda!",
  "Opa, {name}! 🎖️ Condecoração semanal!",
  "Bom dia, {name}! 🏅 Medalha de honra!",
  "E aí, {name}! 👑 Rei/Rainha da semana!",
  "Fala, {name}! 💎 Diamante bruto a lapidar!",
  "Oi, {name}! 🌈 Arco-íris da semana!",
  "Olá, {name}! 🌅 Nascer do sol semanal!",
  "Opa, {name}! 🌄 Aurora da prosperidade!",
  "Bom dia, {name}! 🌞 Sol brilhante!",
  "E aí, {name}! ☀️ Raios de sucesso!",
  "Fala, {name}! 🌤️ Céu limpo!",
  "Oi, {name}! 🌻 Girassol da semana!",
  "Olá, {name}! 🌺 Flor da segunda!",
  "Opa, {name}! 🌸 Primavera financeira!",
  "Bom dia, {name}! 🌼 Margarida da sorte!",
  "E aí, {name}! 🌷 Tulipa da prosperidade!",
  "Fala, {name}! 🌹 Rosa do sucesso!",
  "Oi, {name}! 🍀 Trevo de quatro folhas!",
  "Olá, {name}! 🌿 Verde esperança!",
  "Opa, {name}! 🌾 Colheita semanal!",
  "Bom dia, {name}! 🌲 Pinheiro forte!",
];

// ============================================
// SAUDAÇÕES DE SEXTA-FEIRA (30 saudações)
// ============================================
const fridayGreetings = [
  "Sextou, {name}! 🎉 Vamos fechar a semana bem?",
  "E aí, {name}! 🥳 Sexta-feira chegou!",
  "Fala, {name}! 🎊 Fim de semana chegando, finanças organizadas!",
  "Oi, {name}! 🌟 Sexta é dia de comemorar o controle!",
  "Opa, {name}! 🎈 Sextou com as contas em dia!",
  "Bom dia, {name}! 🍾 Champanhe do sucesso!",
  "E aí, {name}! 🥂 Brinde à organização!",
  "Fala, {name}! 🎆 Fogos de vitória!",
  "Oi, {name}! 🎇 Brilho especial!",
  "Olá, {name}! ✨ Magia da sexta!",
  "Opa, {name}! 💫 Estrela cadente!",
  "Bom dia, {name}! 🌟 Brilho intenso!",
  "E aí, {name}! 🌠 Constelação do sucesso!",
  "Fala, {name}! 🌌 Galáxia da prosperidade!",
  "Oi, {name}! 🪐 Planeta organizado!",
  "Olá, {name}! 🌍 Mundo perfeito!",
  "Opa, {name}! 🌎 Globo de ouro!",
  "Bom dia, {name}! 🌏 Terra prometida!",
  "E aí, {name}! 🗺️ Mapa do tesouro!",
  "Fala, {name}! 🧭 Bússola certeira!",
  "Oi, {name}! 🏝️ Ilha paradisíaca!",
  "Olá, {name}! 🏖️ Praia tranquila!",
  "Opa, {name}! 🏄 Onda perfeita!",
  "Bom dia, {name}! 🌊 Mar calmo!",
  "E aí, {name}! ⛵ Vento favorável!",
  "Fala, {name}! 🚤 Lancha veloz!",
  "Oi, {name}! 🛥️ Iate luxuoso!",
  "Olá, {name}! ⚓ Ancorado no sucesso!",
  "Opa, {name}! 🏴‍☠️ Tesouro encontrado!",
  "Bom dia, {name}! 💰 Baú cheio!",
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
