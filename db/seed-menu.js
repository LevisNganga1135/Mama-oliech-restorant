// db/seed-menu.js
// Migration seed script to populate dishes database from menu.js catalog data

const pool = require('./db');

// Authoritative frontend MENU_ITEMS to be migrated
const MENU_ITEMS = [
    {
        id: 'tilapia-dry',
        name: 'Whole Tilapia (Dry Fry)',
        price: 'KES 1,200',
        priceValue: 1200,
        category: 'fish',
        description: "Sourced fresh daily from Lake Victoria, seasoned with Mama's secret salt rub and deep-fried to crispy golden perfection. The definitive Mama Oliech experience.",
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDXtTWMi6q7mgXF28CjVVVB9xh_n2xTuMhevNiPI-qzYlW5MW8UNBJA5uY3PddKMcCq-ziaDp6shRR-cEnwiPmvmlqnzSldn0X2zwRqHBld8VTSByJOhhVwsyyJqUp8wwr3ZrXMISKqaBgR6USA6br_gFlAi5a3Qpxa_vCBsQY1QVsyrMSoOm7RtYg7S5g_haMEnbqLxZFCs3e4qlp_EKpon8oANtPMtmmmm9gCN74bEkVwSAPnl0XW',
        badge: 'Bestseller',
        spicy: false,
        allergens: 'Fish'
    },
    {
        id: 'tilapia-wet',
        name: 'Whole Tilapia (Wet Fry)',
        price: 'KES 1,350',
        priceValue: 1350,
        category: 'fish',
        description: 'Deep-fried Tilapia finished in a rich, slow-simmered reduction of fresh tomatoes, onions, garlic, and local herbs. Served with the sauce poured tableside.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCKu2uOyOXITPsJ-kAp8tXar2JNtJMbhJJDXRSub7PYKHqsyCrv5RDiq5SXE-A5HAl_ewskWkpJ75ppwrEKHutogGUjSqQEmHV8H0iFqUstGoq5DI-SlF6x6SpU6vzd9OAg4x_OX7zVCL53LwMk1WiECMGAPq_j_tMSBIwpoEkhX7t83wFtN2wVYO7Y4iRLD1uSDKYXqkbi9KsIbnQ_084zS65uUzp6-NwoWvtNAwnS34AG_COdx-rs',
        badge: 'Popular',
        spicy: false,
        allergens: 'Fish'
    },
    {
        id: 'zuckerberg-special',
        name: 'The Zuckerberg Special',
        price: 'KES 1,450',
        priceValue: 1450,
        category: 'fish',
        description: 'The exact meal ordered by Mark Zuckerberg on his 2016 Africa tour: one whole large Tilapia, a steaming dome of white maize Ugali, and a side of Sukuma Wiki.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAO75jHTM-cAuEcr8rClPXJT5fTV9rI1QpfoxXSQve9shgLcxWN9fPEbg_Us_yBfLiE-_UcXfdqybS4ElN3edC4PZPJCi61uSVt6f_KaGIkTR6ZhEoy7JKtYygtBE9JZDKsSR4qZHVFBRjFOlMiw0byZO6PiQcPeJZz5NP-x7uYDW7MGqCA1TFpO8se2KTRpnXDfEbouHEDcB7vaS-JbzwHwsynqB3E56OrR8MKwOZzY7SbBmraLPkZ',
        badge: 'Legendary',
        spicy: false,
        allergens: 'Fish, Gluten (Ugali — maize only, naturally gluten-free)'
    },
    {
        id: 'coconut-perch',
        name: 'Coconut Nile Perch Fillet',
        price: 'KES 1,500',
        priceValue: 1500,
        category: 'fish',
        description: 'Pan-seared Nile Perch fillet simmered low in rich coconut milk, infused with fresh ginger root, coriander, and a touch of yellow curry. Coastal Kenya on a plate.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC4ruQ-xIKchEwkaUwmu79gUZXyCPfSMIC40wYuFQOhqcfZAa_k4XbzSTmgYxKifVLPAWLqY-kjykDUNMZxVe2u0YshApBa3GuRh_Zoc3DYyiPd6yfwhc9bOC3R-FjYD6ubwXjMsBwL9302SZRXuTfddB4vFCr-A7151XVXzNjO4KWgHhPbTAE3zeTxS1hU1darG9hRSkPBGS3u5vrU-h3IHWbBimm-vAurx5oBWmbnI9av2r5f6lfP',
        badge: "Chef's Pick",
        spicy: false,
        allergens: 'Fish, Tree nuts (coconut)'
    },
    {
        id: 'catfish-stew',
        name: 'Claypot Catfish Stew',
        price: 'KES 1,600',
        priceValue: 1600,
        category: 'fish',
        description: 'Slow-cooked catfish chunks in a hand-crafted earthen clay pot, layered with native lakeside spices, dried chili, and aromatic bay leaf. Smoky and deeply traditional.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCe3xR9CvwlA4JR5XK-6KevSE3aVdSfAcuHVIITFv2QrReEGMeNHpC4mDENNd5438IzVJaPh1S8cuLj37u7rzYp6AnNrIliElrO5bQ44rpVK-4WhGm_-cyS46KR9TR4dJUu0UUMI3Z4REH1zG3zyVuRO0FcKazjcSRqwtNQvyls3siM9xqJFIM51lcDgMmjSwlV_heLs8sGtaGTir9sjzgBimprLC38b87C21qJ7cA_lViyQHzbOrue',
        badge: 'Traditional',
        spicy: true,
        allergens: 'Fish'
    },
    {
        id: 'side-ugali',
        name: 'White Maize Ugali',
        price: 'KES 200',
        priceValue: 200,
        category: 'sides',
        description: "A steaming dome of Kenya's most beloved staple — fine white maize flour worked over heat into a firm, smooth mound. The essential companion to any fish dish.",
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E',
        badge: 'Essential',
        spicy: false,
        allergens: 'None'
    },
    {
        id: 'side-sukuma',
        name: 'Sautéed Sukuma Wiki',
        price: 'KES 150',
        priceValue: 150,
        category: 'sides',
        description: 'Freshly harvested collard greens, washed and fine-sliced, then lightly sautéed with slivers of onion, ripe tomato, and just a pinch of salt. Clean and vibrant.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQhf69-Ihz8_kT__Endw2W_-_5064SwBHzZR6FBK5EETAqpbPGmMrd6uT_E9BHaxI12efdDbs-GaRvF56vbbou3NxI9xvjSPguZ-Yv73JBs7tDcTbuk0GUoiDXpyTGfdYntnnH-jaCMT9Sx_EG3mDkue_jcuX3zOK8sLfSMFU1MYT6lELJ2HffYhqrjazsbv2u0WX40GDZSJVD9_GGpJTqCOeGcIxHjflvLl-nwFdpbdKgbDxcrh-Q',
        badge: 'Classic',
        spicy: false,
        allergens: 'None'
    },
    {
        id: 'side-managu',
        name: 'Traditional Managu',
        price: 'KES 250',
        priceValue: 250,
        category: 'sides',
        description: 'Indigenous African nightshade leafy greens — bitter, earthy, and deeply nourishing. Cooked with onions, a splash of cream, and traditional lakeside methods passed down through generations.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9SiQwpEDwlGxYVVkKon1UqTXF8eE5PZWXD3Fz_YWma2ddMoYvgUoa3mhNkPOvm60Z5KO_Gt1DPOgfa00v9H1ZI6o705timUblF-3ag017ZjTBLBNAIBtlRM-n8TDzCPIOwUxrkvC-vyHiRydp6u6_-gIdyetytuYZV0NGcpX_LrYefb7T0OizNmHBM-7LHh_sCpdomaTvMOpwwQVP4RFLJdx3f9AFth1vf39idoF8lPb13naKpYw0',
        badge: 'Heritage',
        spicy: false,
        allergens: 'Dairy (cream)'
    },
    {
        id: 'side-kachumbari',
        name: 'Fresh Spicy Kachumbari',
        price: 'KES 150',
        priceValue: 150,
        category: 'sides',
        description: 'Finely diced fresh tomatoes, red onion, coriander leaf, and sliced green chili, tossed in a bright squeeze of fresh lime juice. The classic Kenyan salsa.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_VAk5ajUc7W7reoolTN5yVWBrqX5OYoD4V3MIPp0ie9ZQQxlsu98JRmgzS0PNzDAAezC2qwaRllutkNBfvZqnN6haAB_vFqSxDxTIr9zg67211cF65ett9jnsVpcgBPnVkHtbx6Qg38N-ByGhjo-YsXpDpg9g_I3wXtqzB4MtWAGwCo8MYuS_CG5IsVRRCeCouWUYZmnGpca76LzznGD0C-TtZ0TEEtsaDohtaV4dCqjONO-zojOa',
        badge: 'Zesty',
        spicy: true,
        allergens: 'None'
    },
    {
        id: 'drink-juice',
        name: 'Fresh Mango Juice',
        price: 'KES 300',
        priceValue: 300,
        category: 'drinks',
        description: 'Hand-pressed each morning from the sweetest ripe local mangoes. No water, no sugar added — just pure chilled fruit in a tall glass.',
        image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDSswVC4l5qrk4dO6TXNRNzp7k1hI-8phbCxB0BN_3MDoDW-rtQW1jNSVdt_VAh8d41b6ip6kRRXgmE8Ua5d093ryYPL4dPMstqzn7eYasMdgFcbfP5OC_GJ_O3Td__5IO3YSDmj1lV-ueWGizZyK2foj2_YuVS4xahi_J85Z3FOx4QzxulieQTmBvsnywPHCOQUIjVCoI7GSSRw5VYs27vQHb3wEx97O4AG5BoJiodyif2O0B6p05E',
        badge: 'Fresh',
        spicy: false,
        allergens: 'None'
    }
];

async function seed() {
    console.log('🔄 Seeding dishes table from local menu items data...');
    
    try {
        await pool.transaction(async trx => {
            // Remove existing items first
            await trx('dishes').del();
            
            const dishesToInsert = MENU_ITEMS.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                price_value: item.priceValue,
                category: item.category,
                description: item.description,
                image_url: item.image,
                badge: item.badge,
                is_spicy: item.spicy,
                allergens: item.allergens
            }));

            // Native bulk insert is fast and safe
            await trx('dishes').insert(dishesToInsert);
            
            for (const item of MENU_ITEMS) {
                console.log(`✓ Seeded dish: ${item.name}`);
            }
        });
        
        console.log('🎉 Menu dishes data seeded successfully!');
    } catch (err) {
        console.error('💥 Error seeding data:', err);
    } finally {
        await pool.end();
    }
}

seed();
