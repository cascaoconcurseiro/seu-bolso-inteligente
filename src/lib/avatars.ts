// Sistema de avatares personalizáveis com imagens reais
// Avatares disponíveis na pasta Avatar/
const avatarImages = Array.from({ length: 183 }, (_, i) => {
  const num = i + 1;
  // Mapear os arquivos disponíveis (apenas JPG, PNG, WEBP - excluir SVG)
  const extensions = ['jpg', 'png', 'webp'];
  return {
    id: `avatar_${num}`,
    name: `Avatar ${num}`,
    // Tentar encontrar o arquivo correto
    path: `/Avatar/imgi_${num}_*.{jpg,png,webp}`
  };
});

// Lista de avatares reais disponíveis (apenas os JPG/PNG principais)
export const avatarIcons = [
  { id: 'avatar_1', path: '/Avatar/imgi_1_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671116.jpg', name: 'Avatar 1' },
  { id: 'avatar_2', path: '/Avatar/imgi_2_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671138.jpg', name: 'Avatar 2' },
  { id: 'avatar_3', path: '/Avatar/imgi_3_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671118.jpg', name: 'Avatar 3' },
  { id: 'avatar_4', path: '/Avatar/imgi_4_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671128.jpg', name: 'Avatar 4' },
  { id: 'avatar_5', path: '/Avatar/imgi_5_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671159.jpg', name: 'Avatar 5' },
  { id: 'avatar_6', path: '/Avatar/imgi_6_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671122.jpg', name: 'Avatar 6' },
  { id: 'avatar_7', path: '/Avatar/imgi_7_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671134.jpg', name: 'Avatar 7' },
  { id: 'avatar_8', path: '/Avatar/imgi_8_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671126.jpg', name: 'Avatar 8' },
  { id: 'avatar_9', path: '/Avatar/imgi_9_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671161.jpg', name: 'Avatar 9' },
  { id: 'avatar_10', path: '/Avatar/imgi_10_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671124.jpg', name: 'Avatar 10' },
  { id: 'avatar_11', path: '/Avatar/imgi_11_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671120.jpg', name: 'Avatar 11' },
  { id: 'avatar_12', path: '/Avatar/imgi_12_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671175.jpg', name: 'Avatar 12' },
  { id: 'avatar_13', path: '/Avatar/imgi_13_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671136.jpg', name: 'Avatar 13' },
  { id: 'avatar_14', path: '/Avatar/imgi_14_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671169.jpg', name: 'Avatar 14' },
  { id: 'avatar_15', path: '/Avatar/imgi_15_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671151.jpg', name: 'Avatar 15' },
  { id: 'avatar_16', path: '/Avatar/imgi_16_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671157.jpg', name: 'Avatar 16' },
  { id: 'avatar_17', path: '/Avatar/imgi_17_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671132.jpg', name: 'Avatar 17' },
  { id: 'avatar_18', path: '/Avatar/imgi_18_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671165.jpg', name: 'Avatar 18' },
  { id: 'avatar_19', path: '/Avatar/imgi_19_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671142.jpg', name: 'Avatar 19' },
  { id: 'avatar_20', path: '/Avatar/imgi_20_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671140.jpg', name: 'Avatar 20' },
  { id: 'avatar_21', path: '/Avatar/imgi_21_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671147.jpg', name: 'Avatar 21' },
  { id: 'avatar_22', path: '/Avatar/imgi_22_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671171.jpg', name: 'Avatar 22' },
  { id: 'avatar_23', path: '/Avatar/imgi_23_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671155.jpg', name: 'Avatar 23' },
  { id: 'avatar_24', path: '/Avatar/imgi_24_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671145.jpg', name: 'Avatar 24' },
  { id: 'avatar_25', path: '/Avatar/imgi_25_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671163.jpg', name: 'Avatar 25' },
  { id: 'avatar_26', path: '/Avatar/imgi_26_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671149.jpg', name: 'Avatar 26' },
  { id: 'avatar_27', path: '/Avatar/imgi_27_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671167.jpg', name: 'Avatar 27' },
  { id: 'avatar_28', path: '/Avatar/imgi_28_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671130.jpg', name: 'Avatar 28' },
  { id: 'avatar_29', path: '/Avatar/imgi_29_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671153.jpg', name: 'Avatar 29' },
  { id: 'avatar_30', path: '/Avatar/imgi_30_ilustracao-3d-de-avatar-ou-perfil-humano_23-2150671173.jpg', name: 'Avatar 30' },
];

// Cores de fundo para os avatares (mantidas para compatibilidade)
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

export const getAvatarColor = (colorId: string) => {
  return avatarColors.find(c => c.id === colorId) || avatarColors[5]; // default green
};

export const getAvatarIcon = (iconId: string) => {
  const icon = avatarIcons.find(i => i.id === iconId);
  // Se não encontrar, retornar o primeiro avatar
  return icon || avatarIcons[0];
};

export const generateAvatar = (colorId: string, iconId: string) => {
  const color = getAvatarColor(colorId);
  const icon = getAvatarIcon(iconId);
  return { color, icon };
};
