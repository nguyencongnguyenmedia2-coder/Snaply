/**
 * Snaply Landing Page — Interactive Scripts & Micro-interactions
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Navbar Scroll Effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar?.classList.add('scrolled');
    } else {
      navbar?.classList.remove('scrolled');
    }
  });

  // 2. Interactive Phone Mockup — Tabs Switcher
  const mockupTabs = document.querySelectorAll('.mockup-nav-btn');
  const mockupScreens = document.querySelectorAll('.mockup-tab-content');

  mockupTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      mockupTabs.forEach(b => b.classList.remove('active'));
      mockupScreens.forEach(s => s.classList.remove('active'));

      btn.classList.add('active');
      const activeScreen = document.getElementById(`tab-${targetTab}`);
      if (activeScreen) {
        activeScreen.classList.add('active');
      }
    });
  });

  // 3. Interactive Camera Shutter Button inside Phone Mockup
  const shutterBtn = document.getElementById('shutterBtn');
  const flashOverlay = document.getElementById('shutterFlash');
  const viewfinderImg = document.getElementById('viewfinderImg');
  const widgetPhotoImg = document.getElementById('widgetPhotoImg');
  const momentCounter = document.getElementById('momentCounter');

  // Sample curated real-life candid photos for interactive camera demo
  const samplePhotos = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80'
  ];

  let currentPhotoIndex = 0;
  let snapsCount = 104250;

  if (shutterBtn && flashOverlay) {
    shutterBtn.addEventListener('click', () => {
      // Shutter click scale animation
      shutterBtn.classList.add('clicked');
      setTimeout(() => shutterBtn.classList.remove('clicked'), 150);

      // Flash effect
      flashOverlay.classList.remove('flash-active');
      void flashOverlay.offsetWidth; // Trigger reflow
      flashOverlay.classList.add('flash-active');

      // Change photo after flash
      setTimeout(() => {
        currentPhotoIndex = (currentPhotoIndex + 1) % samplePhotos.length;
        if (viewfinderImg) {
          viewfinderImg.src = samplePhotos[currentPhotoIndex];
        }
        if (widgetPhotoImg) {
          widgetPhotoImg.src = samplePhotos[currentPhotoIndex];
        }

        // Increment moment counter
        snapsCount += 1;
        if (momentCounter) {
          momentCounter.textContent = `${(snapsCount / 1000).toFixed(1)}k+`;
        }

        // Show toast notification inside mockup
        showMockupToast('✨ Đã gửi ngay lên Widget bạn bè!');
      }, 120);
    });
  }

  function showMockupToast(message) {
    let toast = document.getElementById('mockupToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'mockupToast';
      toast.style.cssText = `
        position: absolute;
        top: 48px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(41, 37, 38, 0.9);
        color: #FFFFFF;
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 700;
        z-index: 120;
        white-space: nowrap;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        opacity: 0;
        transition: opacity 0.25s ease, transform 0.25s ease;
      `;
      document.querySelector('.phone-inner')?.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(4px)';

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 2000);
  }

  // 4. Quick Reaction pills on Widget
  const reactionPills = document.querySelectorAll('.reaction-pill');
  reactionPills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      const emoji = pill.textContent.trim();
      spawnFloatingEmoji(emoji, e.clientX, e.clientY);
    });
  });

  function spawnFloatingEmoji(emoji, x, y) {
    const el = document.createElement('div');
    el.textContent = emoji;
    el.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      font-size: 2rem;
      pointer-events: none;
      z-index: 9999;
      transform: translate(-50%, -50%) scale(0.6);
      transition: all 0.9s cubic-bezier(0.1, 0.8, 0.3, 1);
      opacity: 1;
    `;
    document.body.appendChild(el);

    requestAnimationFrame(() => {
      el.style.transform = `translate(-50%, -120px) scale(1.4)`;
      el.style.opacity = '0';
    });

    setTimeout(() => el.remove(), 950);
  }

  // 5. Interactive Widget Size Showcase
  const sizeButtons = document.querySelectorAll('.size-switch-btn');
  const liveWidgetDemo = document.getElementById('liveWidgetDemo');

  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const size = btn.getAttribute('data-size');
      if (liveWidgetDemo) {
        liveWidgetDemo.className = `live-widget-demo size-${size}`;
      }
    });
  });

  // 6. FAQ Accordion
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    questionBtn?.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      faqItems.forEach(i => i.classList.remove('active'));
      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  // 7. QR Code Modal Dialog
  const qrTriggers = document.querySelectorAll('.qr-trigger-btn, .open-qr-modal');
  const qrModal = document.getElementById('qrModal');
  const closeModalBtn = document.getElementById('closeModalBtn');

  qrTriggers.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      qrModal?.classList.add('active');
    });
  });

  closeModalBtn?.addEventListener('click', () => {
    qrModal?.classList.remove('active');
  });

  qrModal?.addEventListener('click', (e) => {
    if (e.target === qrModal) {
      qrModal.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && qrModal?.classList.contains('active')) {
      qrModal.classList.remove('active');
    }
  });

  // 8. Mobile Menu Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.querySelector('.nav-menu');

  mobileToggle?.addEventListener('click', () => {
    if (navMenu) {
      const isVisible = navMenu.style.display === 'flex';
      navMenu.style.display = isVisible ? 'none' : 'flex';
      if (!isVisible) {
        navMenu.style.position = 'absolute';
        navMenu.style.top = '70px';
        navMenu.style.left = '20px';
        navMenu.style.right = '20px';
        navMenu.style.background = '#FFFFFF';
        navMenu.style.borderRadius = '20px';
        navMenu.style.padding = '20px';
        navMenu.style.flexDirection = 'column';
        navMenu.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)';
      }
    }
  });
});
