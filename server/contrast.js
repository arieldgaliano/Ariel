'use strict';
// Contraste de color según WCAG (relación entre 1 y 21). Sirve para que nadie deje el sitio ilegible.
const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Pares texto/fondo que el sistema usa. 'nav' compara contra los colores fijos del texto del menú.
const PAIRS = [
  ['Texto principal sobre el fondo', t => [t.ink, t.paper]],
  ['Texto principal sobre tarjetas', t => [t.ink, t.paperRaised]],
  ['Texto secundario sobre el fondo', t => [t.inkSoft, t.paper]],
  ['Texto secundario sobre tarjetas', t => [t.inkSoft, t.paperRaised]],
  ['Enlaces sobre el fondo', t => [t.link, t.paper]],
  ['Enlaces sobre tarjetas', t => [t.link, t.paperRaised]],
  ['Letra de los botones sobre su fondo', t => [t.btnText, t.btnBg]],
  ['Texto del menú lateral', t => ['#B8A996', t.sumi]],
];
const check = theme => PAIRS.map(([label, f]) => { const [a, b] = f(theme); return { label, ratio: Math.round(ratio(a, b) * 100) / 100 }; });

module.exports = { ratio, check };
