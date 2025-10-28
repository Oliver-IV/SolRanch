const speciesIcons = {
  'Cattle': '🐄',
  'Horse': '🐴',
  'Sheep': '🐑',
  'Goat': '🐐',
  'Pig': '🐷',
  'Chicken': '🐔',
};

export const speciesOptions = [
  { value: 'Cattle', label: '🐄 Cattle' },
  { value: 'Horse', label: '🐴 Horse' },
  { value: 'Sheep', label: '🐑 Sheep' },
  { value: 'Goat', label: '🐐 Goat' },
  { value: 'Pig', label: '🐷 Pig' },
  { value: 'Chicken', label: '🐔 Chicken' },
];

export function getSpeciesIcon(specie) {
  if (!specie) return '🐄'; 
  
  const key = Object.keys(speciesIcons).find(
    k => k.toLowerCase() === specie.toLowerCase()
  );
  
  return speciesIcons[key] || '🐄'; 
}

export function getSpeciesLabel(specie) {
  const icon = getSpeciesIcon(specie);
  return `${icon} ${specie}`;
}

export default {
  speciesOptions,
  getSpeciesIcon,
  getSpeciesLabel,
};