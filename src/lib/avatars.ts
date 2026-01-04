// Sistema de avatares personalizáveis
export const avatarColors = [
  { id: 'red', name: 'Vermelho', bg: '#ef4444', text: '#ffffff' },
  { id: 'orange', name: 'Laranja', bg: '#f97316', text: '#ffffff' },
  { id: 'amber', name: 'Âmbar', bg: '#f59e0b', text: '#ffffff' },
  { id: 'yellow', name: 'Amarelo', bg: '#eab308', text: '#000000' },
  { id: 'lime', name: 'Lima', bg: '#84cc16', text: '#000000' },
  { id: 'green', name: 'Verde', bg: '#10b981', text: '#ffffff' },
  { id: 'emerald', name: 'Esmeralda', bg: '#059669', text: '#ffffff' },
  { id: 'teal', name: 'Azul-petróleo', bg: '#14b8a6', text: '#ffffff' },
  { id: 'cyan', name: 'Ciano', bg: '#06b6d4', text: '#ffffff' },
  { id: 'sky', name: 'Céu', bg: '#0ea5e9', text: '#ffffff' },
  { id: 'blue', name: 'Azul', bg: '#3b82f6', text: '#ffffff' },
  { id: 'indigo', name: 'Índigo', bg: '#6366f1', text: '#ffffff' },
  { id: 'violet', name: 'Violeta', bg: '#8b5cf6', text: '#ffffff' },
  { id: 'purple', name: 'Roxo', bg: '#a855f7', text: '#ffffff' },
  { id: 'fuchsia', name: 'Fúcsia', bg: '#d946ef', text: '#ffffff' },
  { id: 'pink', name: 'Rosa', bg: '#ec4899', text: '#ffffff' },
  { id: 'rose', name: 'Rosa-escuro', bg: '#f43f5e', text: '#ffffff' },
  { id: 'slate', name: 'Ardósia', bg: '#64748b', text: '#ffffff' },
  { id: 'gray', name: 'Cinza', bg: '#6b7280', text: '#ffffff' },
  { id: 'zinc', name: 'Zinco', bg: '#71717a', text: '#ffffff' },
];

export const avatarIcons = [
  { id: 'user', emoji: '👤', name: 'Usuário' },
  { id: 'smile', emoji: '😊', name: 'Sorriso' },
  { id: 'cool', emoji: '😎', name: 'Legal' },
  { id: 'heart', emoji: '❤️', name: 'Coração' },
  { id: 'star', emoji: '⭐', name: 'Estrela' },
  { id: 'fire', emoji: '🔥', name: 'Fogo' },
  { id: 'rocket', emoji: '🚀', name: 'Foguete' },
  { id: 'crown', emoji: '👑', name: 'Coroa' },
  { id: 'gem', emoji: '💎', name: 'Diamante' },
  { id: 'trophy', emoji: '🏆', name: 'Troféu' },
  { id: 'money', emoji: '💰', name: 'Dinheiro' },
  { id: 'piggy', emoji: '🐷', name: 'Porquinho' },
  { id: 'cat', emoji: '🐱', name: 'Gato' },
  { id: 'dog', emoji: '🐶', name: 'Cachorro' },
  { id: 'bear', emoji: '🐻', name: 'Urso' },
  { id: 'panda', emoji: '🐼', name: 'Panda' },
  { id: 'koala', emoji: '🐨', name: 'Coala' },
  { id: 'lion', emoji: '🦁', name: 'Leão' },
  { id: 'tiger', emoji: '🐯', name: 'Tigre' },
  { id: 'fox', emoji: '🦊', name: 'Raposa' },
  { id: 'unicorn', emoji: '🦄', name: 'Unicórnio' },
  { id: 'butterfly', emoji: '🦋', name: 'Borboleta' },
  { id: 'flower', emoji: '🌸', name: 'Flor' },
  { id: 'tree', emoji: '🌳', name: 'Árvore' },
  { id: 'sun', emoji: '☀️', name: 'Sol' },
  { id: 'moon', emoji: '🌙', name: 'Lua' },
  { id: 'rainbow', emoji: '🌈', name: 'Arco-íris' },
  { id: 'coffee', emoji: '☕', name: 'Café' },
  { id: 'pizza', emoji: '🍕', name: 'Pizza' },
  { id: 'cake', emoji: '🎂', name: 'Bolo' },
  { id: 'gift', emoji: '🎁', name: 'Presente' },
  { id: 'balloon', emoji: '🎈', name: 'Balão' },
  { id: 'music', emoji: '🎵', name: 'Música' },
  { id: 'camera', emoji: '📷', name: 'Câmera' },
  { id: 'book', emoji: '📚', name: 'Livro' },
  { id: 'pencil', emoji: '✏️', name: 'Lápis' },
  { id: 'palette', emoji: '🎨', name: 'Paleta' },
  { id: 'game', emoji: '🎮', name: 'Game' },
  { id: 'soccer', emoji: '⚽', name: 'Futebol' },
  { id: 'basketball', emoji: '🏀', name: 'Basquete' },
  { id: 'plane', emoji: '✈️', name: 'Avião' },
  { id: 'car', emoji: '🚗', name: 'Carro' },
  { id: 'bike', emoji: '🚲', name: 'Bicicleta' },
  { id: 'home', emoji: '🏠', name: 'Casa' },
  { id: 'beach', emoji: '🏖️', name: 'Praia' },
  { id: 'mountain', emoji: '⛰️', name: 'Montanha' },
];

export const getAvatarColor = (colorId: string) => {
  return avatarColors.find(c => c.id === colorId) || avatarColors[5]; // default green
};

export const getAvatarIcon = (iconId: string) => {
  return avatarIcons.find(i => i.id === iconId) || avatarIcons[0]; // default user
};

export const generateAvatar = (colorId: string, iconId: string) => {
  const color = getAvatarColor(colorId);
  const icon = getAvatarIcon(iconId);
  return { color, icon };
};
