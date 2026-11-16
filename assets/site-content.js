'use strict';
/* C.S MUDATHR MUSLIM - public content renderer. No credentials in this file. */
(function () {
  const textSelectors = {
    eyebrow: '.eyebrow',
    heroHighlight: '#hero-title .gold-text',
    heroDescription: '.hero-lead',
    aboutHighlight: '.about .section-head h2 span',
    aboutIntro: '.about .section-head p',
    aboutDescription: '.about-details > p',
    featuresHighlight: '#features .section-head h2 span',
    feature1Title: '.feature-card:nth-child(1) h3',
    feature1Description: '.feature-card:nth-child(1) p',
    feature2Title: '.feature-card:nth-child(2) h3',
    feature2Description: '.feature-card:nth-child(2) p',
    feature3Title: '.feature-card:nth-child(3) h3',
    feature3Description: '.feature-card:nth-child(3) p',
    feature4Title: '.feature-card:nth-child(4) h3',
    feature4Description: '.feature-card:nth-child(4) p',
    downloadHighlight: '#download .download-copy h2 span',
    downloadDescription: '#download .download-copy > p',
    downloadBadge: '.download-badge',
    faqTitle: '#faq-title'
  };
  function get(sel) { return document.querySelector(sel); }
  function setText(sel, val) { const el = get(sel); if (el && typeof val === 'string') el.textContent = val; }
  function replaceHeadStart(sel, val) {
    const el = get(sel);
    if (!el || typeof val !== 'string') return;
    const firstText = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE);
    if (firstText) firstText.textContent = val;
  }
  function replaceLinkText(sel, val) {
    const el = get(sel);
    if (!el || typeof val !== 'string') return;
    const node = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
    if (node) node.textContent = ' ' + val + ' ';
  }
  const colors = { background: '--bg', gold: '--gold', cyan: '--cyan' };
  function validColor(c) { return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c); }
  function validAsset(v) { return typeof v === 'string' && /^assets\/[a-zA-Z0-9_.-]+\.(?:png|webp|jpe?g)(?:\?v=\d+)?$/.test(v); }
  function validDownload(v) {
    return typeof v === 'string' && /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+\/releases\/(?:latest\/download|download\/[A-Za-z0-9_.-]+)\/[A-Za-z0-9_.-]+\.apk$/i.test(v);
  }
  function apply(config) {
    if (!config || typeof config !== 'object') return;
    const t = config.text || {};
    for (const [key, sel] of Object.entries(textSelectors)) {
      if (key === 'eyebrow') replaceLinkText(sel, t[key]);
      else setText(sel, t[key]);
    }
    replaceHeadStart('#hero-title', t.heroTitle);
    replaceHeadStart('.about .section-head h2', t.aboutTitle);
    replaceHeadStart('.about-details h3', t.aboutDetailTitle);
    replaceHeadStart('#features .section-head h2', t.featuresTitle);
    replaceHeadStart('#download .download-copy h2', t.downloadTitle);
    // The old headline includes a BR; preserve the gold secondary line.
    replaceLinkText('.header-action', t.downloadNav);
    replaceLinkText('.hero-actions .btn-ghost', t.heroSecondaryButton);
    replaceLinkText('.hero-actions .btn-primary', t.heroDownloadButton);
    replaceLinkText('.micro-note', t.microNote);
    setText('.footer-top > div:first-child > p', t.footerDescription);
    if (t.aboutDetailHighlight) {
      const h = get('.about-details h3');
      if (h) {
        const br = h.querySelector('br');
        const after = br?.nextSibling;
        if (after && after.nodeType === Node.TEXT_NODE) after.textContent = t.aboutDetailHighlight;
      }
    }
    if (t.availabilityMessage && !document.getElementById('download-android')?.getAttribute('href')?.startsWith('https://')) {
      setText('#availability-message', t.availabilityMessage);
    }
    const v = config.visibility || {};
    for (const key of ['about','features','download','faq']) {
      const sel = key === 'faq' ? '.faq' : '#' + key;
      const el = get(sel);
      if (el && typeof v[key] === 'boolean') el.hidden = !v[key];
    }
    const note = String(t.announcement || '').trim();
    if (v.announcement && note) {
      const hero = get('.hero');
      if (hero && !document.getElementById('cs-site-announcement')) {
        const a = document.createElement('aside');
        a.id = 'cs-site-announcement';
        a.className = 'cs-announcement';
        a.style.cssText = 'max-width:1160px;margin:20px auto 0;padding:17px 22px;background:#17253b;border:1px solid var(--gold);color:var(--gold);border-radius:14px;text-align:center;font-weight:bold;line-height:1.8';
        a.textContent = note;
        hero.parentElement.insertBefore(a, hero);
      }
    }
    const img = config.images || {};
    if (validAsset(img.logo)) {
      document.querySelectorAll('.app-icon-display img, .download-image img').forEach(x => { x.src = img.logo; });
    }
    if (validAsset(img.screenshot)) setImage('.phone-device img', img.screenshot);
    function setImage(sel, src) { const e = get(sel); if (e) e.src = src; }
    const theme = config.theme || {};
    for (const [k, css] of Object.entries(colors)) {
      if (validColor(theme[k])) document.documentElement.style.setProperty(css, theme[k]);
    }
    if (validDownload(config.downloadUrl)) {
      for (const a of document.querySelectorAll('.download-link')) {
        // Previous public script can have a click-prevention handler. Cloning drops it.
        const clone = a.cloneNode(true);
        a.parentNode.replaceChild(clone, a);
        clone.href = config.downloadUrl;
        clone.removeAttribute('aria-disabled');
        clone.classList.remove('not-yet');
        clone.rel = 'noopener noreferrer';
        clone.setAttribute('aria-label', 'تحميل تطبيق مسلم مراد APK');
      }
      setText('.android-label', 'تحميل APK الآن');
      setText('#android-status', 'متاح الآن');
      setText('#availability-message', 'تحميل مباشر من ملف الإصدار المنشور على GitHub.');
    }
  }
  async function start() {
    try {
      const res = await fetch('assets/site-content.json?ts=' + Date.now(), {cache:'no-store'});
      if (!res.ok) return;
      apply(await res.json());
    } catch (e) { /* If content file is offline, keep the original site functioning. */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
