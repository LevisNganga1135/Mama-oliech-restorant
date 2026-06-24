/**
 * main.js — Mama Oliech Restaurant
 * Global script loaded on every page via <script src="js/main.js" defer>
 *
 * Responsibilities:
 *  1. Scroll-reveal — IntersectionObserver for .reveal elements
 *  2. Header — sticky shadow state on scroll
 *  3. Mobile overlay — open / close / focus-trap / Escape key
 *  4. Lightbox — gallery image zoom with prev/next navigation
 *  5. FAQ accordion — toggleFaq() exposed on window for inline onclick
 */

'use strict';

/* ─────────────────────────────────────────────────────────────────────────────
   UTILITY: Detect user preference for reduced motion once at startup.
   Used throughout to skip animations entirely when requested.
───────────────────────────────────────────────────────────────────────────── */
const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
).matches;

/* ═════════════════════════════════════════════════════════════════════════════
   INIT — fires after DOM is parsed (script has defer attribute)
═════════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    initReveal();
    initHeader();
    initMobileOverlay();
    initLightbox();
});

/* ─────────────────────────────────────────────────────────────────────────────
   1. SCROLL REVEAL — IntersectionObserver
   Adds .active to every .reveal element when it enters the viewport.
   Elements that are already visible on load (above the fold) are activated
   immediately without waiting for a scroll event.
───────────────────────────────────────────────────────────────────────────── */
function initReveal() {
    const revealEls = document.querySelectorAll('.reveal');
    if (!revealEls.length) return;

    // If user prefers reduced motion, skip the animation — reveal everything now.
    if (prefersReducedMotion) {
        revealEls.forEach(el => el.classList.add('active'));
        return;
    }

    const observer = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('active');
                // Unobserve immediately — no need to watch once revealed.
                obs.unobserve(entry.target);
            });
        },
        {
            // Fire when 12% of the element is visible.
            // -60px bottom margin means elements near the very bottom edge
            // don't trigger until the user has scrolled meaningfully past them.
            threshold: 0.12,
            rootMargin: '0px 0px -60px 0px',
        }
    );

    revealEls.forEach(el => observer.observe(el));
}

/* ─────────────────────────────────────────────────────────────────────────────
   2. HEADER — scrolled state
   The CSS rule header.scrolled elevates the shadow and increases opacity.
   We also tighten the nav padding on scroll for a compact feel.
   Inline style.padding is set on the <nav> child, not the <header> itself,
   so it doesn't fight the CSS position:sticky.
───────────────────────────────────────────────────────────────────────────── */
function initHeader() {
    const header = document.querySelector('header');
    if (!header) return;

    // Throttle scroll handler — only recalculate once per animation frame.
    let ticking = false;

    const onScroll = () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            ticking = false;
        });
    };

    window.addEventListener('scroll', onScroll, { passive: true });

    // Run once on load in case the page is already scrolled (e.g. hash link).
    onScroll();
}

/* ─────────────────────────────────────────────────────────────────────────────
   3. MOBILE OVERLAY — toggle, focus-trap, Escape key, scroll-lock
   Selectors used in HTML:
     .mobile-nav-toggle  — hamburger button in header
     .mobile-menu-overlay — full-screen overlay div
     .mobile-menu-close   — × button inside the overlay
     .mobile-menu-overlay a — nav links that should also close the menu
───────────────────────────────────────────────────────────────────────────── */
function initMobileOverlay() {
    const toggle  = document.querySelector('.mobile-nav-toggle');
    const overlay = document.querySelector('.mobile-menu-overlay');
    const closeBtn = document.querySelector('.mobile-menu-close');

    if (!toggle || !overlay) return;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const openMenu = () => {
        overlay.classList.add('active');
        toggle.setAttribute('aria-expanded', 'true');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // prevent background scroll

        // Move focus into the overlay for keyboard accessibility.
        // Slight delay lets the CSS visibility:visible transition complete first.
        setTimeout(() => {
            const firstFocusable = overlay.querySelector(
                'button, a, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) firstFocusable.focus();
        }, 50);
    };

    const closeMenu = (returnFocus = true) => {
        overlay.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        if (returnFocus) toggle.focus();
    };

    // ── ARIA initial state ───────────────────────────────────────────────────
    toggle.setAttribute('aria-controls', 'mobile-menu-overlay');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Navigation menu');
    overlay.id = 'mobile-menu-overlay';

    // ── Event listeners ──────────────────────────────────────────────────────

    toggle.addEventListener('click', openMenu);

    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeMenu());
        closeBtn.setAttribute('aria-label', 'Close navigation menu');
    }

    // Any nav link inside the overlay closes the menu when tapped.
    overlay.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => closeMenu(false));
    });

    // Escape key closes the menu.
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            closeMenu();
        }
    });

    // ── Focus trap ───────────────────────────────────────────────────────────
    // When the overlay is open, Tab/Shift+Tab should cycle only within it.
    overlay.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        if (!overlay.classList.contains('active')) return;

        const focusable = Array.from(
            overlay.querySelectorAll(
                'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            )
        ).filter(el => !el.closest('[aria-hidden="true"]'));

        if (!focusable.length) return;

        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    });
}

/* ─────────────────────────────────────────────────────────────────────────────
   4. LIGHTBOX — gallery image zoom with prev / next navigation
   Triggered by clicks on:
     .gallery-item img   — masonry gallery cards (gallery.html)
     img.cursor-zoom-in  — any image tagged for zoom on other pages

   The lightbox element is created once and appended to <body>.
   It supports:
     • Click image   → open at that index
     • ← → arrow keys / on-screen buttons → prev / next
     • Click backdrop or × button → close
     • Escape key → close
     • Swipe left/right on touch → prev / next
───────────────────────────────────────────────────────────────────────────── */
function initLightbox() {
    // Collect all zoomable images present on this page.
    const zoomableImages = Array.from(
        document.querySelectorAll('.gallery-item img, img.cursor-zoom-in')
    );

    if (!zoomableImages.length) return;

    // ── Build the lightbox DOM once ──────────────────────────────────────────
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Image viewer');
    lightbox.setAttribute('aria-hidden', 'true');

    lightbox.innerHTML = `
        <button class="lightbox-close" aria-label="Close image viewer">
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <button class="lightbox-prev" aria-label="Previous image">
            <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
        </button>
        <img class="lightbox-content" src="" alt="" />
        <button class="lightbox-next" aria-label="Next image">
            <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
        </button>
        <div class="lightbox-counter" aria-live="polite" aria-atomic="true"></div>
    `;

    document.body.appendChild(lightbox);

    // ── Style the prev/next buttons (not in CSS since they're JS-created) ───
    const navBtnStyle = `
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255,255,255,0.12);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 50%;
        color: #fff;
        width: 3rem;
        height: 3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: background 0.2s ease;
        z-index: 201;
    `;

    const prevBtn    = lightbox.querySelector('.lightbox-prev');
    const nextBtn    = lightbox.querySelector('.lightbox-next');
    const closeBtn   = lightbox.querySelector('.lightbox-close');
    const img        = lightbox.querySelector('.lightbox-content');
    const counter    = lightbox.querySelector('.lightbox-counter');

    prevBtn.style.cssText = navBtnStyle + 'left: 1.25rem;';
    nextBtn.style.cssText = navBtnStyle + 'right: 1.25rem;';

    counter.style.cssText = `
        position: absolute;
        bottom: 1.5rem;
        left: 50%;
        transform: translateX(-50%);
        color: rgba(255,255,255,0.6);
        font-size: 0.8rem;
        font-family: var(--font-body, sans-serif);
        pointer-events: none;
    `;

    // Hide prev/next if only one image.
    if (zoomableImages.length <= 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
        counter.style.display = 'none';
    }

    // ── State ────────────────────────────────────────────────────────────────
    let currentIndex = 0;

    // ── Helpers ──────────────────────────────────────────────────────────────

    const updateDisplay = (index) => {
        const src  = zoomableImages[index].getAttribute('src');
        const alt  = zoomableImages[index].getAttribute('alt') || 'Gallery image';
        img.setAttribute('src', src);
        img.setAttribute('alt', alt);
        counter.textContent = `${index + 1} / ${zoomableImages.length}`;

        // Grey-out prev/next at boundaries.
        prevBtn.style.opacity = index === 0 ? '0.3' : '1';
        nextBtn.style.opacity = index === zoomableImages.length - 1 ? '0.3' : '1';
    };

    const openLightbox = (index) => {
        currentIndex = index;
        updateDisplay(currentIndex);

        lightbox.style.display = 'flex';
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Fade in.
        if (!prefersReducedMotion) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => lightbox.classList.add('active'));
            });
        } else {
            lightbox.classList.add('active');
        }

        closeBtn.focus();
    };

    const closeLightbox = () => {
        lightbox.classList.remove('active');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';

        const delay = prefersReducedMotion ? 0 : 300;
        setTimeout(() => {
            lightbox.style.display = 'none';
            img.setAttribute('src', ''); // free memory
        }, delay);

        // Return focus to the image that opened the lightbox.
        const opener = zoomableImages[currentIndex];
        if (opener) opener.focus();
    };

    const showPrev = () => {
        if (currentIndex > 0) {
            currentIndex--;
            updateDisplay(currentIndex);
        }
    };

    const showNext = () => {
        if (currentIndex < zoomableImages.length - 1) {
            currentIndex++;
            updateDisplay(currentIndex);
        }
    };

    // ── Attach click to each gallery image ───────────────────────────────────
    zoomableImages.forEach((image, i) => {
        image.style.cursor = 'zoom-in';
        // Make images keyboard-focusable so they work without a mouse.
        if (!image.getAttribute('tabindex')) {
            image.setAttribute('tabindex', '0');
            image.setAttribute('role', 'button');
            image.setAttribute('aria-label',
                `View full size: ${image.getAttribute('alt') || 'gallery image'}`
            );
        }

        const open = () => openLightbox(i);
        image.addEventListener('click', open);
        // Also open on Enter/Space for keyboard users.
        image.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                open();
            }
        });
    });

    // ── Lightbox control listeners ────────────────────────────────────────────
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click',  showPrev);
    nextBtn.addEventListener('click',  showNext);

    // Clicking the dark backdrop (not the image or buttons) closes.
    lightbox.addEventListener('click', e => {
        if (e.target === lightbox || e.target === img) {
            // img click closes (toggle zoom-out feel); backdrop click closes.
            if (e.target === lightbox) closeLightbox();
        }
    });

    // Keyboard navigation while lightbox is open.
    document.addEventListener('keydown', e => {
        if (!lightbox.classList.contains('active')) return;
        switch (e.key) {
            case 'Escape':      closeLightbox(); break;
            case 'ArrowLeft':   showPrev();       break;
            case 'ArrowRight':  showNext();       break;
        }
    });

    // ── Touch swipe support ──────────────────────────────────────────────────
    let touchStartX = 0;
    const SWIPE_THRESHOLD = 50; // px

    lightbox.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener('touchend', e => {
        if (!lightbox.classList.contains('active')) return;
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) < SWIPE_THRESHOLD) return;
        if (dx < 0) showNext();
        else showPrev();
    }, { passive: true });
}

/* ─────────────────────────────────────────────────────────────────────────────
   5. FAQ ACCORDION — toggleFaq(button)
   Called via inline onclick="toggleFaq(this)" on each .faq-question button.
   Exposed on window so it works regardless of script load order.

   DOM structure expected (from events.html):
     <div class="faq-item">
       <button class="faq-question" onclick="toggleFaq(this)">
         Question text
         <span class="material-symbols-outlined">expand_more</span>
       </button>
       <div class="faq-content">
         <div class="faq-content-inner">Answer text</div>
       </div>
     </div>
───────────────────────────────────────────────────────────────────────────── */
function toggleFaq(button) {
    if (!button) return;

    const content = button.nextElementSibling; // .faq-content
    const icon    = button.querySelector('.material-symbols-outlined');

    if (!content) return;

    const isOpen = content.style.height && content.style.height !== '0px';

    // ── Close every other open FAQ first ─────────────────────────────────────
    document.querySelectorAll('.faq-item').forEach(item => {
        const otherContent = item.querySelector('.faq-content');
        const otherBtn     = item.querySelector('.faq-question');
        const otherIcon    = otherBtn && otherBtn.querySelector('.material-symbols-outlined');

        if (!otherContent || otherContent === content) return;

        otherContent.style.height = '0px';
        if (otherIcon) {
            otherIcon.style.transform  = 'rotate(0deg)';
            otherIcon.style.transition = 'transform 0.3s ease';
        }
        if (otherBtn) {
            otherBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // ── Toggle the clicked FAQ ────────────────────────────────────────────────
    if (isOpen) {
        // Closing: collapse to 0.
        content.style.height = '0px';
        if (icon) {
            icon.style.transform  = 'rotate(0deg)';
            icon.style.transition = 'transform 0.3s ease';
        }
        button.setAttribute('aria-expanded', 'false');
    } else {
        // Opening: expand to natural height.
        // We read scrollHeight before setting the height so the browser
        // can calculate it from the current overflow:hidden state.
        const targetHeight = content.scrollHeight;
        content.style.height = targetHeight + 'px';
        if (icon) {
            icon.style.transform  = 'rotate(180deg)';
            icon.style.transition = 'transform 0.3s ease';
        }
        button.setAttribute('aria-expanded', 'true');
    }
}

// Expose globally for inline onclick handlers in HTML.
window.toggleFaq = toggleFaq;
