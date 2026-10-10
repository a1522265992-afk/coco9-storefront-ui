import {heroImage, browse, catalogue, help, title} from '../shared.js';
export function minimal(model) {
  return `<section class="minimal-hero"><div class="hero-copy"><p class="catalog-eyebrow">DIGITAL GOODS, BETTER EVERYDAY</p><h1>${title(model,'好用的数字产品，\n让好想法更进一步。')}</h1><p class="catalog-deck">让顺手的工具，成为日常的一部分。</p>${browse()}</div><div class="minimal-scene">${heroImage('minimal',model)}</div></section>${catalogue(model.categories)}${help}`;
}
