# Mama Oliech Restaurant Website

A premium, production-ready multi-page website built with HTML5, CSS3, and JavaScript, designed to present Nairobi's most legendary fish dining experience. 

Restructured from a single-page prototype into a fully organized static web application with complete page transitions, SEO configurations, and a reservation management dashboard.

---

## 📂 Project Structure

```
PROJECT 1/
├── index.html                  # Homepage (Hero, testimonials, famous guests, reservations)
├── menu.html                   # Signature menu page with live search & category filters
├── about.html                  # Culinary heritage, lake roots, and sourcing story
├── events.html                 # Live Lingala nights schedules and interactive FAQs
├── gallery.html                # Masonry-layout photo gallery with lightbox image zoom
├── contact.html                # Directions, opening hours, contact form, and Leaflet JS Map
├── dashboard.html              # Admin portal for staff to track and manage reservations
│
├── css/
│   └── style.css               # Shared custom variables, typography, and premium animations
│
├── js/
│   ├── main.js                 # Global scroll styling, mobile overlays, and lightbox modal triggers
│   ├── menu.js                 # Local list of dishes, filters, and dynamic card generation
│   └── booking.js              # LocalStorage handling, reservation logic, and WhatsApp link generation
│
├── favicon.svg                 # SVG favicon for browser tab display
├── robots.txt                  # SEO crawler instructions
└── sitemap.xml                 # SEO sitemap configuration
```

---

## ✨ Key Features

1. **Earthy African Brand Aesthetic**: Features custom HSL-tailored colors (Brand Charcoal, Terracotta, Forest Green, Gold) matching Mama Oliech's heritage.
2. **Interactive Signatures Menu**: Fully searchable and filterable menu items listing fish types, prices, and traditional sides.
3. **Advanced Reservation Tracking**: Bookings submitted on the homepage reservation form automatically:
   - Formats and prepares a WhatsApp direct message to staff.
   - Saves a record object locally using the browser's `LocalStorage`.
4. **Staff Management Panel**: A custom administrative dashboard (`dashboard.html`) displaying total reservations, expected guest counts, pending reviews, and allowing staff to search, filter, confirm, complete, or delete bookings.
5. **Interactive Mapping**: Powered by Leaflet JS (no API keys required), centering the restaurant's location coordinates dynamically in Kilimani, Nairobi.
6. **Polished Micro-Animations**:
   - Infinite carousel scrolling for customer testimonials.
   - Elegant fade-up scroll animations for clean entry.
   - Zoom lightboxes for gallery viewing.
   - Collapsible accordion-style FAQ lists.

---

## 🚀 Getting Started

Since the application is built on static web technologies, there are zero compilation steps or framework installations required.

### Viewing the Site
1. **Open Directly**: Double-click `index.html` on any machine to open the website in your browser.
2. **Local Server (Recommended)**: Use a lightweight development server like Live Server (VS Code Extension) or run Python's built-in server in the project directory:
   ```bash
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000` in your web browser.

### Seeding Reservations
When opening the **Reservation Dashboard** (`dashboard.html`) for the first time, the system automatically populates the table with demo seed bookings (such as Mark Zuckerberg, Idris Elba) to demonstrate the layout. You can clear or reload the mock data at any time by clicking the **Reset Seed Data** button at the top of the dashboard.

### 🔌 M-Pesa Local Testing & Webhooks (ngrok)
To test M-Pesa Daraja callback webhooks locally, you can use the automated tunnel script:

1. **Install and Authenticate ngrok**:
   Ensure ngrok is installed and authenticated on your local machine:
   ```bash
   ngrok config add-authtoken <your-auth-token>
   ```
2. **Run the Tunnel Script**:
   Run the following script in your project root folder:
   ```bash
   ./start-mpesa-tunnel.sh
   ```
   *Note: Because free ngrok URLs change on every restart, this script needs to be re-run each development session.*
3. **Restart the Server**:
   The script will automatically detect your local server port, launch ngrok, and update the `MPESA_CALLBACK_URL` in your `.env` file. You must **restart your Express server** afterward so it loads the updated `.env` configuration.
