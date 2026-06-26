/**
 * menu.js — Mama Oliech Restaurant
 * Loaded exclusively on menu.html via <script src="js/menu.js" defer>
 *
 * Responsibilities:
 *  1. MENU_ITEMS  — authoritative dish data array
 *  2. renderMenu()  — build card DOM from a filtered array
 *  3. filterMenu()  — apply active category + search query
 *  4. Event wiring  — .filter-btn clicks, #menu-search input (debounced)
 *  5. Accessibility — result count announcer, keyboard-operable filter buttons
 */

'use strict';

/* ═════════════════════════════════════════════════════════════════════════════
   1. MENU DATA
   Each item has: id, name, price, priceValue (number for sorting), category,
   description, image, badge, spicy, allergens (informational string).

   Categories match data-filter attributes on .filter-btn elements:
     fish | sides | drinks
═════════════════════════════════════════════════════════════════════════════ */

/**
 * @typedef {{
 *   id:          string,
 *   name:        string,
 *   price:       string,
 *   priceValue:  number,
 *   category:    'fish'|'sides'|'drinks',
 *   description: string,
 *   image:       string,
 *   badge:       string,
 *   spicy:       boolean,
 *   allergens:   string
 * }} MenuItem
 */

/** @type {MenuItem[]} */
const MENU_ITEMS = [

    /* ── Lakeside Fish ────────────────────────────────────────────────────── */
    {
        id:          'tilapia-dry',
        name:        'Whole Tilapia (Dry Fry)',
        price:       'KES 1,200',
        priceValue:  1200,
        category:    'fish',
        description: 'Sourced fresh daily from Lake Victoria, seasoned with Mama\'s secret salt rub and deep-fried to crispy golden perfection. The definitive Mama Oliech experience.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuDXtTWMi6q7mgXF28CjVVVB9xh_n2xTuMhevNiPI-qzYlW5MW8UNBJA5uY3PddKMcCq-ziaDp6shRR-cEnwiPmvmlqnzSldn0X2zwRqHBld8VTSByJOhhVwsyyJqUp8wwr3ZrXMISKqaBgR6USA6br_gFlAi5a3Qpxa_vCBsQY1QVsyrMSoOm7RtYg7S5g_haMEnbqLxZFCs3e4qlp_EKpon8oANtPMtmmmm9gCN74bEkVwSAPnl0XW',
        badge:       'Bestseller',
        spicy:       false,
        allergens:   'Fish'
    },
    {
        id:          'tilapia-wet',
        name:        'Whole Tilapia (Wet Fry)',
        price:       'KES 1,350',
        priceValue:  1350,
        category:    'fish',
        description: 'Deep-fried Tilapia finished in a rich, slow-simmered reduction of fresh tomatoes, onions, garlic, and local herbs. Served with the sauce poured tableside.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuCKu2uOyOXITPsJ-kAp8tXar2JNtJMbhJJDXRSub7PYKHqsyCrv5RDiq5SXE-A5HAl_ewskWkpJ75ppwrEKHutogGUjSqQEmHV8H0iFqUstGoq5DI-SlF6x6SpU6vzd9OAg4x_OX7zVCL53LwMk1WiECMGAPq_j_tMSBIwpoEkhX7t83wFtN2wVYO7Y4iRLD1uSDKYXqkbi9KsIbnQ_084zS65uUzp6-NwoWvtNAwnS34AG_COdx-rs',
        badge:       'Popular',
        spicy:       false,
        allergens:   'Fish'
    },
    {
        id:          'zuckerberg-special',
        name:        'The Zuckerberg Special',
        price:       'KES 1,450',
        priceValue:  1450,
        category:    'fish',
        description: 'The exact meal ordered by Mark Zuckerberg on his 2016 Africa tour: one whole large Tilapia, a steaming dome of white maize Ugali, and a side of Sukuma Wiki.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuAO75jHTM-cAuEcr8rClPXJT5fTV9rI1QpfoxXSQve9shgLcxWN9fPEbg_Us_yBfLiE-_UcXfdqybS4ElN3edC4PZPJCi61uSVt6f_KaGIkTR6ZhEoy7JKtYygtBE9JZDKsSR4qZHVFBRjFOlMiw0byZO6PiQcPeJZz5NP-x7uYDW7MGqCA1TFpO8se2KTRpnXDfEbouHEDcB7vaS-JbzwHwsynqB3E56OrR8MKwOZzY7SbBmraLPkZ',
        badge:       'Legendary',
        spicy:       false,
        allergens:   'Fish, Gluten (Ugali — maize only, naturally gluten-free)'
    },
    {
        id:          'coconut-perch',
        name:        'Coconut Nile Perch Fillet',
        price:       'KES 1,500',
        priceValue:  1500,
        category:    'fish',
        description: 'Pan-seared Nile Perch fillet simmered low in rich coconut milk, infused with fresh ginger root, coriander, and a touch of yellow curry. Coastal Kenya on a plate.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuC4ruQ-xIKchEwkaUwmu79gUZXyCPfSMIC40wYuFQOhqcfZAa_k4XbzSTmgYxKifVLPAWLqY-kjykDUNMZxVe2u0YshApBa3GuRh_Zoc3DYyiPd6yfwhc9bOC3R-FjYD6ubwXjMsBwL9302SZRXuTfddB4vFCr-A7151XVXzNjO4KWgHhPbTAE3zeTxS1hU1darG9hRSkPBGS3u5vrU-h3IHWbBimm-vAurx5oBWmbnI9av2r5f6lfP',
        badge:       'Chef\'s Pick',
        spicy:       false,
        allergens:   'Fish, Tree nuts (coconut)'
    },
    {
        id:          'catfish-stew',
        name:        'Claypot Catfish Stew',
        price:       'KES 1,600',
        priceValue:  1600,
        category:    'fish',
        description: 'Slow-cooked catfish chunks in a hand-crafted earthen clay pot, layered with native lakeside spices, dried chili, and aromatic bay leaf. Smoky and deeply traditional.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuCe3xR9CvwlA4JR5XK-6KevSE3aVdSfAcuHVIITFv2QrReEGMeNHpC4mDENNd5438IzVJaPh1S8cuLj37u7rzYp6AnNrIliElrO5bQ44rpVK-4WhGm_-cyS46KR9TR4dJUu0UUMI3Z4REH1zG3zyVuRO0FcKazjcSRqwtNQvyls3siM9xqJFIM51lcDgMmjSwlV_heLs8sGtaGTir9sjzgBimprLC38b87C21qJ7cA_lViyQHzbOrue',
        badge:       'Traditional',
        spicy:       true,
        allergens:   'Fish'
    },

    /* ── Traditional Sides ────────────────────────────────────────────────── */
    {
        id:          'side-ugali',
        name:        'White Maize Ugali',
        price:       'KES 200',
        priceValue:  200,
        category:    'sides',
        description: 'A steaming dome of Kenya\'s most beloved staple — fine white maize flour worked over heat into a firm, smooth mound. The essential companion to any fish dish.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E',
        badge:       'Essential',
        spicy:       false,
        allergens:   'None'
    },
    {
        id:          'side-sukuma',
        name:        'Sautéed Sukuma Wiki',
        price:       'KES 150',
        priceValue:  150,
        category:    'sides',
        description: 'Freshly harvested collard greens, washed and fine-sliced, then lightly sautéed with slivers of onion, ripe tomato, and just a pinch of salt. Clean and vibrant.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuAQhf69-Ihz8_kT__Endw2W_-_5064SwBHzZR6FBK5EETAqpbPGmMrd6uT_E9BHaxI12efdDbs-GaRvF56vbbou3NxI9xvjSPguZ-Yv73JBs7tDcTbuk0GUoiDXpyTGfdYntnnH-jaCMT9Sx_EG3mDkue_jcuX3zOK8sLfSMFU1MYT6lELJ2HffYhqrjazsbv2u0WX40GDZSJVD9_GGpJTqCOeGcIxHjflvLl-nwFdpbdKgbDxcrh-Q',
        badge:       'Classic',
        spicy:       false,
        allergens:   'None'
    },
    {
        id:          'side-managu',
        name:        'Traditional Managu',
        price:       'KES 250',
        priceValue:  250,
        category:    'sides',
        description: 'Indigenous African nightshade leafy greens — bitter, earthy, and deeply nourishing. Cooked with onions, a splash of cream, and traditional lakeside methods passed down through generations.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuA9SiQwpEDwlGxYVVkKon1UqTXF8eE5PZWXD3Fz_YWma2ddMoYvgUoa3mhNkPOvm60Z5KO_Gt1DPOgfa00v9H1ZI6o705timUblF-3ag017ZjTBLBNAIBtlRM-n8TDzCPIOwUxrkvC-vyHiRydp6u6_-gIdyetytuYZV0NGcpX_LrYefb7T0OizNmHBM-7LHh_sCpdomaTvMOpwwQVP4RFLJdx3f9AFth1vf39idoF8lPb13naKpYw0',
        badge:       'Heritage',
        spicy:       false,
        allergens:   'Dairy (cream)'
    },
    {
        id:          'side-kachumbari',
        name:        'Fresh Spicy Kachumbari',
        price:       'KES 150',
        priceValue:  150,
        category:    'sides',
        description: 'Finely diced fresh tomatoes, red onion, coriander leaf, and sliced green chili, tossed in a bright squeeze of fresh lime juice. The classic Kenyan salsa.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuA_VAk5ajUc7W7reoolTN5yVWBrqX5OYoD4V3MIPp0ie9ZQQxlsu98JRmgzS0PNzDAAezC2qwaRllutkNBfvZqnN6haAB_vFqSxDxTIr9zg67211cF65ett9jnsVpcgBPnVkHtbx6Qg38N-ByGhjo-YsXpDpg9g_I3wXtqzB4MtWAGwCo8MYuS_CG5IsVRRCeCouWUYZmnGpca76LzznGD0C-TtZ0TEEtsaDohtaV4dCqjONO-zojOa',
        badge:       'Zesty',
        spicy:       true,
        allergens:   'None'
    },
    {
        id:          'side-fries',
        name:        'Hand-Cut Masala Fries',
        price:       'KES 300',
        priceValue:  300,
        category:    'sides',
        description: 'Thick-cut local potatoes fried to a golden crisp and tossed hot in a spiced tomato-and-chili masala dry rub. Addictive as a standalone snack or side.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuA_VAk5ajUc7W7reoolTN5yVWBrqX5OYoD4V3MIPp0ie9ZQQxlsu98JRmgzS0PNzDAAezC2qwaRllutkNBfvZqnN6haAB_vFqSxDxTIr9zg67211cF65ett9jnsVpcgBPnVkHtbx6Qg38N-ByGhjo-YsXpDpg9g_I3wXtqzB4MtWAGwCo8MYuS_CG5IsVRRCeCouWUYZmnGpca76LzznGD0C-TtZ0TEEtsaDohtaV4dCqjONO-zojOa',
        badge:       'Spicy',
        spicy:       true,
        allergens:   'None'
    },

    /* ── Beverages ────────────────────────────────────────────────────────── */
    {
        id:          'drink-juice',
        name:        'Fresh Mango Juice',
        price:       'KES 300',
        priceValue:  300,
        category:    'drinks',
        description: 'Hand-pressed each morning from the sweetest ripe local mangoes. No water, no sugar added — just pure chilled fruit in a tall glass.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E',
        badge:       'Fresh',
        spicy:       false,
        allergens:   'None'
    },
    {
        id:          'drink-tea',
        name:        'Mama\'s Hibiscus Tea',
        price:       'KES 250',
        priceValue:  250,
        category:    'drinks',
        description: 'A ruby-red iced infusion of organic hibiscus calyces steeped with fresh ginger root, whole cloves, and a squeeze of lime. Served over ice, deeply refreshing.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuAQhf69-Ihz8_kT__Endw2W_-_5064SwBHzZR6FBK5EETAqpbPGmMrd6uT_E9BHaxI12efdDbs-GaRvF56vbbou3NxI9xvjSPguZ-Yv73JBs7tDcTbuk0GUoiDXpyTGfdYntnnH-jaCMT9Sx_EG3mDkue_jcuX3zOK8sLfSMFU1MYT6lELJ2HffYhqrjazsbv2u0WX40GDZSJVD9_GGpJTqCOeGcIxHjflvLl-nwFdpbdKgbDxcrh-Q',
        badge:       'Refreshing',
        spicy:       false,
        allergens:   'None'
    },
    {
        id:          'drink-passion',
        name:        'Passion Fruit Juice',
        price:       'KES 280',
        priceValue:  280,
        category:    'drinks',
        description: 'Tangy East African passion fruit, pressed and strained, lightly sweetened with raw cane sugar and served chilled. Pairs perfectly with the dry fry.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E',
        badge:       'Local',
        spicy:       false,
        allergens:   'None'
    },
    {
        id:          'drink-soda',
        name:        'Chilled Sodas (500ml)',
        price:       'KES 150',
        priceValue:  150,
        category:    'drinks',
        description: 'Your choice of Coca-Cola, Fanta Orange, Sprite, or Krest Bitter Lemon — served straight from the fridge in a glass bottle.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E',
        badge:       'Cold',
        spicy:       false,
        allergens:   'None'
    },
    {
        id:          'drink-water',
        name:        'Still / Sparkling Water',
        price:       'KES 100',
        priceValue:  100,
        category:    'drinks',
        description: 'Keringet still or sparkling mineral water from the Kenyan highlands. Available in 500ml or 1L.',
        image:       'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E',
        badge:       'Pure',
        spicy:       false,
        allergens:   'None'
    }
];

/* ═════════════════════════════════════════════════════════════════════════════
   2. SAFE ESCAPING
   All item content is authored in-file, but we escape defensively anyway
   so future data sources (CMS, API) can't inject markup.
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Escape a value for safe insertion into HTML text content.
 * @param {*} val
 * @returns {string}
 */
function esc(val) {
    if (val === null || val === undefined) return '';
    return String(val)
        .replace(/&/g,  '&amp;')
        .replace(/</g,  '&lt;')
        .replace(/>/g,  '&gt;')
        .replace(/"/g,  '&quot;')
        .replace(/'/g,  '&#039;');
}

/* ═════════════════════════════════════════════════════════════════════════════
   3. CARD BUILDER
   Returns a fully-formed <article> element for one menu item.
   All dynamic content is escaped. No raw HTML injection from data.
═════════════════════════════════════════════════════════════════════════════ */

/**
 * Build a single menu card element.
 * @param {MenuItem} item
 * @returns {HTMLElement}
 */
function buildCard(item) {
    const article = document.createElement('article');
    article.className = 'card menu-card';
    article.setAttribute('data-category', item.category);
    article.setAttribute('data-id', item.id);

    // ── Image wrapper with lazy loading and error fallback ───────────────────
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'card-img-wrapper';

    const img = document.createElement('img');
    img.src     = item.image;
    img.alt     = item.name + ' — ' + item.category + ' at Mama Oliech Restaurant';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width   = 400;
    img.height  = 225;
    // Fallback: show a branded placeholder if the image fails to load.
    img.onerror = function () {
        this.onerror = null; // prevent infinite loop
        this.src = 'data:image/svg+xml,' + encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="225" viewBox="0 0 400 225">' +
            '<rect width="400" height="225" fill="#FBF6EE"/>' +
            '<text x="50%" y="45%" text-anchor="middle" font-size="48" fill="#D9692D">🐟</text>' +
            '<text x="50%" y="68%" text-anchor="middle" font-size="14" fill="#4D4540" font-family="sans-serif">Image unavailable</text>' +
            '</svg>'
        );
        this.alt = item.name + ' (image unavailable)';
    };

    imgWrapper.appendChild(img);

    // ── Card body ─────────────────────────────────────────────────────────────
    const body = document.createElement('div');
    body.className = 'menu-card-body';
    body.style.cssText = 'padding: 1.25rem 1.5rem 1.5rem; display: flex; flex-direction: column; flex: 1;';

    // Title row — name + price
    const titleRow = document.createElement('div');
    titleRow.style.cssText = 'display:flex; justify-content:space-between; align-items:flex-start; gap:0.75rem; margin-bottom:0.5rem;';

    const heading = document.createElement('h3');
    heading.className = 'font-headline';
    heading.style.cssText = 'font-size:1.15rem; line-height:1.3; flex:1;';
    heading.textContent = item.name; // textContent — no escaping needed for DOM text

    const price = document.createElement('span');
    price.className = 'menu-item-price';
    price.setAttribute('aria-label', 'Price: ' + item.price);
    price.textContent = item.price;

    titleRow.appendChild(heading);
    titleRow.appendChild(price);

    // Description
    const desc = document.createElement('p');
    desc.style.cssText = 'font-size:0.875rem; color:var(--on-surface-variant); line-height:1.6; margin-bottom:1.25rem; flex:1;';
    desc.textContent = item.description;

    // Badge row
    const badgeRow = document.createElement('div');
    badgeRow.style.cssText = 'display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; margin-top:auto;';

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = item.badge;
    badgeRow.appendChild(badge);

    if (item.spicy) {
        const spicyBadge = document.createElement('span');
        spicyBadge.className = 'badge';
        spicyBadge.style.cssText = 'background-color:rgba(186,26,26,0.08); color:#ba1a1a;';
        spicyBadge.setAttribute('aria-label', 'Contains chili — spicy dish');
        spicyBadge.textContent = '🌶 Spicy';
        badgeRow.appendChild(spicyBadge);
    }

    if (item.allergens && item.allergens !== 'None') {
        const allergenNote = document.createElement('span');
        allergenNote.style.cssText = 'font-size:0.7rem; color:var(--on-surface-variant); opacity:0.7; margin-left:auto;';
        allergenNote.setAttribute('aria-label', 'Allergens: ' + item.allergens);
        allergenNote.title = 'Contains: ' + item.allergens;
        allergenNote.textContent = '⚠ ' + item.allergens;
        badgeRow.appendChild(allergenNote);
    }

    body.appendChild(titleRow);
    body.appendChild(desc);
    body.appendChild(badgeRow);

    article.appendChild(imgWrapper);
    article.appendChild(body);

    return article;
}

/* ═════════════════════════════════════════════════════════════════════════════
   4. RENDER FUNCTION
   Clears #menu-grid and injects a DocumentFragment of cards.
   Updates the live-region result count for screen readers.
═════════════════════════════════════════════════════════════════════════════ */

/** @type {HTMLElement|null} — cached once on init */
let _grid = null;
/** @type {HTMLElement|null} — live region for screen reader announcements */
let _announcer = null;

/**
 * Render a filtered subset of items into #menu-grid.
 * @param {MenuItem[]} items
 */
function renderMenu(items) {
    if (!_grid) return;

    const fragment = document.createDocumentFragment();

    if (items.length === 0) {
        // Empty state — single cell spanning all columns.
        const empty = document.createElement('div');
        empty.className = 'menu-empty-state';
        // Inline style because grid-column span needs to work at all breakpoints.
        // The grid-3 class switches between 1 and 3 cols — we span 1 at mobile,
        // span all at desktop. Using -webkit-fill-available width as fallback.
        empty.style.cssText = [
            'grid-column: 1 / -1',
            'text-align: center',
            'padding: 4rem 2rem',
            'opacity: 0.65',
            'display: flex',
            'flex-direction: column',
            'align-items: center',
            'gap: 1rem',
        ].join(';');
        empty.innerHTML =
            '<span style="font-size:3rem;">🔍</span>' +
            '<p style="font-size:1.1rem;font-weight:600;">No dishes matched your search.</p>' +
            '<p style="font-size:0.9rem;">Try a different keyword or select <strong>All Items</strong> above.</p>';
        fragment.appendChild(empty);

        announce('No results found. Try adjusting your search or filter.');
    } else {
        items.forEach(item => fragment.appendChild(buildCard(item)));
        const label = items.length === 1
            ? '1 dish found'
            : items.length + ' dishes found';
        announce(label);
    }

    // Single DOM write.
    _grid.innerHTML = '';
    _grid.appendChild(fragment);
}

/**
 * Update the ARIA live region so screen readers announce result counts.
 * @param {string} message
 */
function announce(message) {
    if (_announcer) _announcer.textContent = message;
}

/* ═════════════════════════════════════════════════════════════════════════════
   5. FILTER & SEARCH
═════════════════════════════════════════════════════════════════════════════ */

/** Current active category filter. 'all' means no category restriction. */
let _activeCategory = 'all';

/** Current debounce timer handle. */
let _debounceTimer = null;

/**
 * Apply the active category and current search query, then re-render.
 * Reading the search value fresh on each call keeps state minimal.
 */
function applyFilters() {
    const searchInput = document.getElementById('menu-search');
    const rawQuery    = searchInput ? searchInput.value : '';
    const query       = rawQuery.trim().toLowerCase();

    let results = MENU_ITEMS;

    // Category filter.
    if (_activeCategory !== 'all') {
        results = results.filter(item => item.category === _activeCategory);
    }

    // Full-text search across name, description, badge, and allergens.
    if (query.length > 0) {
        results = results.filter(item =>
            item.name.toLowerCase().includes(query)        ||
            item.description.toLowerCase().includes(query) ||
            item.badge.toLowerCase().includes(query)       ||
            item.allergens.toLowerCase().includes(query)
        );
    }

    renderMenu(results);
}

/**
 * Debounced wrapper for applyFilters.
 * Waits 200ms after the user stops typing before running the filter —
 * avoids re-rendering on every single keystroke.
 */
function debouncedFilter() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(applyFilters, 200);
}

/* ═════════════════════════════════════════════════════════════════════════════
   6. INIT — wire everything up on DOMContentLoaded
═════════════════════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
    // Guard: only run on pages that have the menu grid.
    _grid = document.getElementById('menu-grid');
    if (!_grid) return;

    // ── ARIA live region ──────────────────────────────────────────────────────
    // Inject a visually-hidden element that screen readers will monitor.
    // Placed outside the grid so it isn't wiped on re-render.
    _announcer = document.createElement('div');
    _announcer.setAttribute('aria-live', 'polite');
    _announcer.setAttribute('aria-atomic', 'true');
    _announcer.style.cssText = [
        'position:absolute',
        'width:1px',
        'height:1px',
        'padding:0',
        'overflow:hidden',
        'clip:rect(0,0,0,0)',
        'white-space:nowrap',
        'border:0',
    ].join(';');
    document.body.appendChild(_announcer);

    // ── Search input ──────────────────────────────────────────────────────────
    const searchInput = document.getElementById('menu-search');
    if (searchInput) {
        searchInput.addEventListener('input', debouncedFilter);

        // Clear search with Escape key for quick reset.
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                applyFilters();
                searchInput.blur();
            }
        });
    }

    // ── Filter buttons ────────────────────────────────────────────────────────
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(btn => {
        // Each button is already a <button> in the HTML so it's keyboard-operable
        // by default — no extra tabindex needed.

        btn.addEventListener('click', () => {
            // Only act if this isn't already the active filter.
            const newCategory = btn.dataset.filter || 'all';
            if (newCategory === _activeCategory) return;

            // Update active state visually and in state.
            filterBtns.forEach(b => {
                b.classList.remove('active');
                b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active');
            btn.setAttribute('aria-pressed', 'true');

            _activeCategory = newCategory;

            // Clear the search box when switching category so results
            // aren't confusingly filtered by both simultaneously on category change.
            // We intentionally keep the search if the user typed something first
            // and then clicks a filter — that's a "refine within category" pattern.
            // So we only clear if the search box is empty already.
            applyFilters();
        });
    });

    // Set initial ARIA pressed state to match the HTML default of data-filter="all".
    filterBtns.forEach(btn => {
        const isActive = btn.classList.contains('active');
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // ── Initial render ────────────────────────────────────────────────────────
    renderMenu(MENU_ITEMS);
});

window.MENU_ITEMS = MENU_ITEMS;

