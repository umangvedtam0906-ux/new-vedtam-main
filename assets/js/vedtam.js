//Premium Cursor 
/*
(function () {
  // Only on non-touch devices
  if (!window.matchMedia('(pointer: fine)').matches) return;

  const outer = document.createElement('div');
  const inner = document.createElement('div');
  outer.className = 'vt-cursor-outer';
  outer.style.pointerEvents = 'none'; // Prevent cursor from interfering with mouse events
  inner.className = 'vt-cursor-inner';
  inner.style.pointerEvents = 'none'; // Prevent cursor from interfering with mouse events
  document.body.appendChild(outer);
  document.body.appendChild(inner);

  let mx = -200, my = -200; // off-screen start
  let ox = -200, oy = -200; // outer position (lagged)
  let raf;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    // Inner snaps immediately
    inner.style.left = mx + 'px';
    inner.style.top = my + 'px';
  });

  // Outer follows lazily via lerp
  function lerp(a, b, t) { return a + (b - a) * t; }
  function animate() {
    ox = lerp(ox, mx, 0.14);
    oy = lerp(oy, my, 0.14);
    outer.style.left = ox + 'px';
    outer.style.top = oy + 'px';
    raf = requestAnimationFrame(animate);
  }
  animate();

  // Hover state on interactive elements
  const HOVER_SELECTORS = 'a,button,[role="button"],.btn,.service-card,.value-card,.why-card,.marquee-item,.faq-question,.sw-service-card,.sw-tech-card,.sw-why-card,.sw-industry-card';
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest(HOVER_SELECTORS)) {
      outer.classList.add('hovered');
      inner.classList.add('hovered');
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest(HOVER_SELECTORS)) {
      outer.classList.remove('hovered');
      inner.classList.remove('hovered');
    }
  });

  // Click pulse
  document.addEventListener('mousedown', () => outer.classList.add('clicking'));
  document.addEventListener('mouseup', () => outer.classList.remove('clicking'));
})();
*/

//  Navbar scroll 
const navbar = document.getElementById('navbar');
const scrollTop = document.getElementById('scrollTop');
let scrollTicking = false;

function syncNavLayoutState() {
  const root = document.documentElement;
  const marquee = document.querySelector('.top-marquee-bar');
  const marqueeHeight = marquee ? Math.round(marquee.getBoundingClientRect().height) : 0;
  const navHeight = navbar ? Math.round(navbar.getBoundingClientRect().height) : 76;
  root.style.setProperty('--vt-marquee-offset', `${marqueeHeight}px`);
  root.style.setProperty('--vt-nav-height', `${navHeight}px`);
}

function updateScrollUi() {
  const isScrolled = window.scrollY > 50;
  if (navbar) navbar.classList.toggle('scrolled', isScrolled);
  const aiStrip = document.querySelector('.ai-quote-strip');
  if (aiStrip) aiStrip.classList.toggle('scrolled', isScrolled);
  if (scrollTop) scrollTop.classList.toggle('visible', window.scrollY > 400);
  scrollTicking = false;
  syncNavLayoutState();
}
window.addEventListener('scroll', () => {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(updateScrollUi);
}, { passive: true });
window.addEventListener('resize', syncNavLayoutState);
window.addEventListener('load', syncNavLayoutState);
updateScrollUi();

// Mobile nav 
const mobileNav = document.getElementById('mobileNav');
let navOpen = false;
function toggleMobileNav() {
  navOpen = !navOpen;
  const burger = document.querySelector('.nav-hamburger');
  syncNavLayoutState();
  if (navOpen) {
    mobileNav.style.display = 'block';
    mobileNav.offsetHeight; // Force reflow for smooth animation transition
    mobileNav.classList.add('open');
    if (burger) burger.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
  } else {
    mobileNav.classList.remove('open');
    if (burger) burger.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => { if (!navOpen) mobileNav.style.display = 'none'; }, 350);
  }
}

function closeMobileNavSafely() {
  navOpen = false;
  const burger = document.querySelector('.nav-hamburger');
  if (mobileNav) {
    mobileNav.classList.remove('open');
    mobileNav.style.display = 'none';
  }
  if (burger) burger.classList.remove('active');
  document.body.style.overflow = '';
}

// Safety: never keep the page scroll-locked after navigation/responsive changes
window.addEventListener('resize', () => {
  if (window.innerWidth > 1024) closeMobileNavSafely();
});

window.addEventListener('pageshow', () => {
  syncNavLayoutState();
  if (!mobileNav || !mobileNav.classList.contains('open')) {
    document.body.style.overflow = '';
  }
});

if (mobileNav) {
  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      closeMobileNavSafely();
    });
  });
}

// Dynamic active state for navigation links
document.addEventListener('DOMContentLoaded', () => {
  let currentPath = window.location.pathname.split('/').pop();
  if (currentPath === '') currentPath = 'index.html';

  const navLinks = document.querySelectorAll('.nav-links a, .mobile-nav a');

  // Clear copied active states first so only the current page stays highlighted.
  navLinks.forEach(link => {
    link.classList.remove('active');
  });

  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    const hrefBase = href ? href.split('?')[0].split('#')[0].split('/').pop() : '';
    if (hrefBase && hrefBase === currentPath) {
      link.classList.add('active');

      const megaMenu = link.closest('.mega-menu');
      if (megaMenu) {
        const parentLink = megaMenu.previousElementSibling;
        if (parentLink && parentLink.tagName === 'A') {
          parentLink.classList.add('active');
        }
      }
    }
  });
});
//  Reveal on scroll 
const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-perspective');
if (reveals.length) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '150px 0px' });
  reveals.forEach(el => observer.observe(el));
}

//  Counter animation
const counters = document.querySelectorAll('.counter, .adv-count');
if (counters.length) {
  const cObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        let current = 0;
        const increment = target / 50;
        const timer = setInterval(() => {
          current += increment;
          if (current >= target) { el.textContent = target; clearInterval(timer); }
          else { el.textContent = Math.floor(current); }
        }, 35);
        cObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => cObserver.observe(c));
}

//  FAQ toggle 
function toggleFaq(el) {
  const item = el.parentElement;
  const isOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
  if (!isOpen) item.classList.add('open');
}

// Services grid: last card span fix on mobile 
function fixServicesGrid() {
  const lastCard = document.querySelector('.service-card:last-child');
  if (lastCard) {
    lastCard.style.gridColumn = window.innerWidth < 768 ? 'span 1' : 'span 3';
  }
}
fixServicesGrid();
window.addEventListener('resize', fixServicesGrid);





// Homepage contact conversion helpers
(function () {
  const EMAILJS_CONFIG = window.VEDTAM_EMAILJS_CONFIG || {
    publicKey: '6WOyjoeStKDv5NUBN',
    serviceId: 'service_138omqz',
    templateId: 'template_87oft6o'
  };
  const GOOGLE_SHEET_WEBHOOK_URL = window.VEDTAM_SHEET_WEBHOOK_URL || 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
  const WHATSAPP_WEBHOOK_URL = window.VEDTAM_WHATSAPP_WEBHOOK_URL || 'YOUR_WHATSAPP_WEBHOOK_URL';

  async function ensureEmailJsLoaded() {
    if (window.emailjs) return true;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
      script.async = true;
      script.onload = () => resolve(!!window.emailjs);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  const forms = document.querySelectorAll('form#consultationForm, form.premium-form');
  const whatsappBtn = document.getElementById('whatsAppLeadButton');
  if (!forms.length) return;

  forms.forEach((form) => {
    // Load reCAPTCHA Enterprise script dynamically if it's not already loaded
    const scriptSrc = 'https://www.google.com/recaptcha/enterprise.js';
    if (!document.querySelector(`script[src*="recaptcha/enterprise.js"]`) && !window.grecaptcha) {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Insert reCAPTCHA widget div if it does not exist
    if (!form.querySelector('.g-recaptcha')) {
      const container = document.createElement('div');
      container.className = 'g-recaptcha';
      container.setAttribute('data-sitekey', '6Lfw7B8tAAAAAF8msWjJqvABoC0B48s0lktM7_L2');
      container.setAttribute('data-action', 'consultation');
      container.style.marginBottom = '1.5rem';
      container.style.display = 'flex';
      container.style.justifyContent = 'center';

      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        submitBtn.parentNode.insertBefore(container, submitBtn);
      } else {
        form.appendChild(container);
      }

      // Explicitly render if API is already loaded
      if (typeof grecaptcha !== 'undefined' && grecaptcha.enterprise && grecaptcha.enterprise.render) {
        try {
          grecaptcha.enterprise.render(container);
        } catch (e) {}
      }
    }

    const nameInput = form.querySelector('#leadName, [name="full_name"]');
    const emailInput = form.querySelector('#leadEmail, [name="work_email"]');
    const phoneInput = form.querySelector('#leadPhone, [name="phone"]');
    const serviceInput = form.querySelector('#leadService, [name="service"]');
    const messageInput = form.querySelector('#leadMessage, [name="message"]');

    function getLeadValues() {
      const name = nameInput?.value?.trim() || 'Not provided';
      const email = emailInput?.value?.trim() || 'Not provided';
      const phone = phoneInput?.value?.trim() || 'Not provided';
      const service = serviceInput?.value || 'General consultation';
      const brief = messageInput?.value?.trim() || 'No project brief shared yet.';
      return { name, email, phone, service, brief };
    }

    function getFormDataMap() {
      const fd = new FormData(form);
      const data = {};
      fd.forEach((value, key) => {
        data[key] = typeof value === 'string' ? value.trim() : value;
      });
      return data;
    }

    function buildPlainLeadMessage() {
      const { name, email, phone, service, brief } = getLeadValues();
      return `Hello Vedtam, I would like a free consultation.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${service}\nProject Brief: ${brief}`;
    }

    function syncWhatsAppLink() {
      if (!whatsappBtn) return;
      whatsappBtn.href = `https://wa.me/917065111015?text=${encodeURIComponent(buildPlainLeadMessage())}`;
    }

    ['input', 'change'].forEach((eventName) => {
      form.addEventListener(eventName, syncWhatsAppLink);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      syncWhatsAppLink();

      // Get reCAPTCHA response (Enterprise)
      let recaptchaResponse = '';
      try {
        const responseField = form.querySelector('[name="g-recaptcha-response"]') || form.querySelector('#g-recaptcha-response');
        if (responseField) {
          recaptchaResponse = responseField.value;
        }
        if (!recaptchaResponse && typeof grecaptcha !== 'undefined' && grecaptcha.enterprise) {
          recaptchaResponse = grecaptcha.enterprise.getResponse();
        }
      } catch (_) {}

      if (!recaptchaResponse) {
        let successMsg = form.querySelector('.form-success-msg');
        if (!successMsg) {
          successMsg = document.createElement('div');
          successMsg.className = 'form-success-msg';
          successMsg.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:10px;';
          form.appendChild(successMsg);
        }
        successMsg.textContent = 'Please complete the reCAPTCHA security check.';
        successMsg.style.background = 'rgba(255, 59, 48, 0.1)';
        successMsg.style.borderColor = 'rgba(255, 59, 48, 0.35)';
        successMsg.style.color = '#ff3b30';
        successMsg.style.display = 'block';
        return;
      }

      const { service } = getLeadValues();
      const subject = `Free Consultation Request - ${service || 'Vedtam'}`;
      let successMsg = form.querySelector('.form-success-msg');
      if (!successMsg) {
        successMsg = document.createElement('div');
        successMsg.className = 'form-success-msg';
        successMsg.style.cssText = 'margin-top:10px;padding:10px 12px;border-radius:10px;background:rgba(34,197,94,0.14);border:1px solid rgba(34,197,94,0.35);color:#86efac;font-weight:600;font-size:0.9rem;';
        form.appendChild(successMsg);
      }
      successMsg.textContent = 'Submitting...';
      successMsg.style.background = 'rgba(34,197,94,0.14)';
      successMsg.style.borderColor = 'rgba(34,197,94,0.35)';
      successMsg.style.color = '#86efac';
      successMsg.style.display = 'block';

      const lead = getLeadValues();
      const formDataMap = getFormDataMap();
      const payload = {
        submitted_at: new Date().toISOString(),
        page_url: window.location.href,
        user_agent: navigator.userAgent,
        subject,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        service: lead.service,
        message: lead.brief,
        full_payload: formDataMap,
        recaptcha: recaptchaResponse
      };

      // Preferred path: notify backend webhook that sends WhatsApp message to the owner.
      if (!WHATSAPP_WEBHOOK_URL.includes('YOUR_WHATSAPP_WEBHOOK_URL')) {
        try {
          const waRes = await fetch(WHATSAPP_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (waRes.ok) {
            successMsg.textContent = 'Successfully submitted.';
            form.reset();
            return;
          }
        } catch (_) {}
      }

      // Primary path: push lead to Google Sheets via Apps Script webhook.
      if (!GOOGLE_SHEET_WEBHOOK_URL.includes('YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL')) {
        try {
          const sheetRes = await fetch(GOOGLE_SHEET_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (sheetRes.ok) {
            successMsg.textContent = 'Successfully submitted.';
            form.reset();
            return;
          }
        } catch (_) {}
      }

      try {
        const ready = await ensureEmailJsLoaded();
        if (!ready || !window.emailjs) throw new Error('emailjs_load_failed');
        if (
          EMAILJS_CONFIG.publicKey.includes('YOUR_') ||
          EMAILJS_CONFIG.serviceId.includes('YOUR_') ||
          EMAILJS_CONFIG.templateId.includes('YOUR_')
        ) {
          throw new Error('emailjs_not_configured');
        }

        window.emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
        await window.emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, {
          subject,
          from_name: lead.name,
          from_email: lead.email,
          reply_to: lead.email,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          service: lead.service,
          message: lead.brief,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
          full_payload: JSON.stringify(formDataMap, null, 2)
        });

        successMsg.textContent = 'Successfully submitted.';
        form.reset();
      } catch (err) {
        try {
          const formSubmitRes = await fetch('https://formsubmit.co/ajax/info@vedtam.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              service: lead.service,
              message: lead.brief,
              page_url: window.location.href,
              user_agent: navigator.userAgent,
              _subject: subject,
              _template: 'table',
              _captcha: 'false'
            })
          });
          if (formSubmitRes.ok) {
            successMsg.textContent = 'Successfully submitted.';
            form.reset();
            return;
          }
        } catch (_) {}

        const fallbackBody = encodeURIComponent(
          `Hello Vedtam, I would like a free consultation.\n\nName: ${lead.name}\nEmail: ${lead.email}\nPhone: ${lead.phone}\nService: ${lead.service}\nProject Brief: ${lead.brief}\nPage URL: ${window.location.href}\nUser Agent: ${navigator.userAgent}`
        );
        const fallbackSubject = encodeURIComponent(subject);
        const mailLink = document.createElement('a');
        mailLink.href = `mailto:info@vedtam.com?subject=${fallbackSubject}&body=${fallbackBody}`;
        mailLink.style.display = 'none';
        document.body.appendChild(mailLink);
        mailLink.click();
        setTimeout(() => mailLink.remove(), 100);

        successMsg.textContent = 'Submitted via fallback. If email app opens, click send.';
        successMsg.style.background = 'rgba(34,197,94,0.14)';
        successMsg.style.borderColor = 'rgba(34,197,94,0.35)';
        successMsg.style.color = '#86efac';
      }
    });

    syncWhatsAppLink();
  });
})();



// Automated CERT-In chart refresh
(() => {
  const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const CERT_DATA_URL = window.VEDTAM_CERT_DATA_URL || "cert-data.json";
  const CERT_IN_PORTAL_UPDATED_AT = window.VEDTAM_CERT_PORTAL_UPDATED_AT || "2026-07-06";
  let chartLibraryPromise = null;
  let automatedChart = null;

  function ensureChartJsLoaded() {
    if (window.Chart) return Promise.resolve(true);
    if (chartLibraryPromise) return chartLibraryPromise;

    chartLibraryPromise = new Promise((resolve) => {
      const existing = document.querySelector('script[src*="chart.js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(!!window.Chart), { once: true });
        existing.addEventListener('error', () => resolve(false), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.async = true;
      script.onload = () => resolve(!!window.Chart);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });

    return chartLibraryPromise;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCertDate(dateValue) {
    const parsed = new Date(`${dateValue || CERT_IN_PORTAL_UPDATED_AT}T00:00:00`);
    return parsed.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  }

  function buildAdvisorySnippet(item) {
    const rawText = item.summary || item.impactAssessment || item.riskAssessment || item.description || "";
    const compact = String(rawText).replace(/\s+/g, " ").trim();
    if (!compact) return "Review the affected versions and apply the recommended remediation steps.";
    return compact.length > 150 ? `${compact.slice(0, 147).trimEnd()}...` : compact;
  }

  function renderAdvisoryItem(item) {
    const title = escapeHtml(item.title || "CERT-In advisory available in the current feed.");
    const code = escapeHtml(item.code || item.id || "CERT-IN");
    const severityRaw = String(item.severity || "info").toLowerCase();
    const severity = ["critical", "high", "medium", "low"].includes(severityRaw) ? severityRaw : "info";
    const severityLabel = escapeHtml(severity.toUpperCase());
    const summary = escapeHtml(buildAdvisorySnippet(item));
    const dateText = escapeHtml(formatCertDate(item.date));
    const cveCount = Array.isArray(item.cves) ? item.cves.length : 0;
    const internalId = item.code || item.id || "";
    const safeLink = internalId ? `cert-advisory.html#${encodeURIComponent(internalId)}` : "cert-advisory.html";

    return `
      <li>
        <div class="cert-update-entry">
          <a class="cert-update-title" href="${safeLink}">${title}</a>
          <p class="cert-update-summary">${summary}</p>
          <div class="cert-update-meta">
            <span class="cert-update-chip severity-${escapeHtml(severity)}">${severityLabel}</span>
            <span class="cert-update-chip">${dateText}</span>
            <span class="cert-update-chip">${code}</span>
            ${cveCount ? `<span class="cert-update-chip">${cveCount} CVE${cveCount > 1 ? "s" : ""}</span>` : ""}
          </div>
        </div>
      </li>
    `;
  }

  async function refreshAutomatedCertChart() {
    const chartCanvas = document.getElementById("chart");
    const totalEl = document.getElementById("total");
    const criticalEl = document.getElementById("critical");
    const highEl = document.getElementById("high");
    const mediumEl = document.getElementById("medium");
    const lowEl = document.getElementById("low");
    const priorityEl = document.getElementById("prioritySeverity");
    const latestDateEl = document.getElementById("latestDate");
    const latestSummaryEl = document.getElementById("latestSummary");
    const latestItemsEl = document.getElementById("latestItems");

    if (!chartCanvas) return;

    try {
      await ensureChartJsLoaded();

      const certUrl = CERT_DATA_URL.includes("?")
        ? `${CERT_DATA_URL}&t=${Date.now()}`
        : `${CERT_DATA_URL}?t=${Date.now()}`;
      const res = await fetch(certUrl, { cache: "no-store" });
      const data = await res.json();

      const syncEl = document.getElementById("lastSyncTime");
      if (syncEl) {
        syncEl.innerText = `Last sync: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }

      const totals = { critical: 0, high: 0, medium: 0, low: 0 };

      data.forEach((item) => {
        const severity = String(item.severity || "").toLowerCase();
        if (severity in totals) {
          totals[severity] += 1;
        }
      });

      if (totalEl) totalEl.innerText = data.length;
      if (criticalEl) criticalEl.innerText = totals.critical;
      if (highEl) highEl.innerText = totals.high;
      if (mediumEl) mediumEl.innerText = totals.medium;
      if (lowEl) lowEl.innerText = totals.low;

      const severityOrder = [
        { key: "critical", label: "Critical Priority" },
        { key: "high", label: "High Priority" },
        { key: "medium", label: "Medium Priority" },
        { key: "low", label: "Low Priority" }
      ];
      const leadingSeverity = severityOrder.reduce((top, current) => {
        return totals[current.key] > totals[top.key] ? current : top;
      }, severityOrder[0]);
      if (priorityEl) priorityEl.innerText = leadingSeverity.label;

      const sortedData = [...data].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      const latestAdvisory = sortedData[0];

      if (latestAdvisory) {
        const latestDateKey = latestAdvisory.date;
        const latest3 = sortedData.slice(0, 3);
        const latestNames = latest3
          .map((item) => item.title)
          .filter(Boolean)
          .map((title) => title.replace(/^Multiple Vulnerabilities in\s+/i, "").trim());

        if (latestDateEl) {
          latestDateEl.innerText = formatCertDate(latestDateKey);
        }
        if (latestSummaryEl) {
          latestSummaryEl.innerText = latestNames.length
            ? `Latest advisories include ${latestNames.join(", ")}. Tap any advisory for affected versions and remediation details.`
            : "Latest CERT-In advisories are shown below with severity, code, and remediation context.";
        }
        if (latestItemsEl) {
          latestItemsEl.innerHTML = latest3.map(renderAdvisoryItem).join("");
        }
      } else {
        if (latestDateEl) {
          latestDateEl.innerText = formatCertDate(CERT_IN_PORTAL_UPDATED_AT);
        }
        if (latestSummaryEl) latestSummaryEl.innerText = "No current advisories were found in the feed.";
        if (latestItemsEl) latestItemsEl.innerHTML = "<li>Latest CERT-In advisories are not available right now.</li>";
      }

      if (chartCanvas && window.Chart) {
        if (automatedChart) {
          automatedChart.destroy();
        } else {
          const existingChart = Chart.getChart(chartCanvas);
          if (existingChart) existingChart.destroy();
        }

        automatedChart = new Chart(chartCanvas.getContext("2d"), {
          type: "doughnut",
        data: {
          labels: ["Critical", "High", "Medium", "Low"],
          datasets: [{
            label: "Vulnerabilities",
            data: [totals.critical, totals.high, totals.medium, totals.low],
            backgroundColor: [
              "#e63946",   /* Critical  â€” vivid red        */
              "#f4842d",   /* High      â€” bold orange       */
              "#f9c74f",   /* Medium    â€” golden amber      */
              "#06d6a0"    /* Low       â€” bright teal-green */
            ],
            borderColor: "#ffffff",
            borderWidth: 3,
            hoverBackgroundColor: [
              "#ff1f2e",   /* Critical  â€” brighter red on hover   */
              "#ff9a45",   /* High      â€” brighter orange on hover */
              "#ffe066",   /* Medium    â€” bright yellow on hover  */
              "#00ffcc"    /* Low       â€” bright cyan-teal hover  */
            ],
            hoverBorderColor: "#ffffff",
            hoverBorderWidth: 5,
            hoverOffset: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "72%",
          onClick: (event, elements) => {
            if (elements && elements.length > 0) {
              const index = elements[0].index;
              const label = automatedChart.data.labels[index].toLowerCase();
              window.location.href = `cert-advisory.html?filter=${label}`;
            }
          },
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              backgroundColor: "rgba(15, 23, 42, 0.96)",
              titleColor: "#ffffff",
              bodyColor: "rgba(226, 232, 240, 0.92)",
              borderColor: "rgba(255, 255, 255, 0.25)",
              borderWidth: 1,
              padding: 14,
              displayColors: true,
              callbacks: {
                label: function (context) {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                  return ` ${label}: ${value} (${pct}%)`;
                }
              }
            }
          }
        }
      });
      }
    } catch (err) {
      console.error("CERT-In Fetch Error:", err);
      if (latestDateEl) {
        latestDateEl.innerText = formatCertDate(CERT_IN_PORTAL_UPDATED_AT);
      }
      if (latestSummaryEl) latestSummaryEl.innerText = "Security dataset is temporarily unavailable.";
      if (latestItemsEl) latestItemsEl.innerHTML = "<li>Please try again shortly.</li>";
    }
  }

  if (!document.getElementById("chart")) return;

  const startAutomatedChart = () => {
    refreshAutomatedCertChart();
    setInterval(refreshAutomatedCertChart, REFRESH_INTERVAL_MS);
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(startAutomatedChart, { timeout: 2000 });
  } else {
    window.addEventListener('load', startAutomatedChart, { once: true });
  }
})();

// CERT-In Subscribe Form Validation
// CERT-In Modal Controls
function openCertModal() {
  const modal = document.getElementById('certSubscribeModal');
  if (modal) {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeCertModal() {
  const modal = document.getElementById('certSubscribeModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

// Global function for email OTP verification
window.openOtpVerificationModal = function({ email, name, onVerifySuccess, onCancel }) {
  // Check if modal element exists in DOM, if not, create it
  let overlay = document.getElementById('otp-verification-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'otp-verification-modal';
    overlay.className = 'otp-modal-overlay';
    overlay.innerHTML = `
      <div class="otp-modal-card">
        <button type="button" class="otp-modal-close" id="otp-close-btn">&times;</button>
        <div class="otp-modal-icon">
          <i class="fas fa-envelope-open-text" aria-hidden="true"></i>
        </div>
        <h3>Verify Your Email</h3>
        <p>We've sent a 6-digit verification code to <span class="otp-target-email" id="otp-target-email"></span>. Please enter it below.</p>
        <div class="otp-input-container">
          <input type="text" maxlength="1" class="otp-digit-input" data-index="0" inputmode="numeric" pattern="[0-9]" />
          <input type="text" maxlength="1" class="otp-digit-input" data-index="1" inputmode="numeric" pattern="[0-9]" />
          <input type="text" maxlength="1" class="otp-digit-input" data-index="2" inputmode="numeric" pattern="[0-9]" />
          <input type="text" maxlength="1" class="otp-digit-input" data-index="3" inputmode="numeric" pattern="[0-9]" />
          <input type="text" maxlength="1" class="otp-digit-input" data-index="4" inputmode="numeric" pattern="[0-9]" />
          <input type="text" maxlength="1" class="otp-digit-input" data-index="5" inputmode="numeric" pattern="[0-9]" />
        </div>
        <div class="otp-error-msg" id="otp-error-msg"></div>
        <button type="button" class="otp-verify-btn" id="otp-verify-btn" disabled>Verify & Proceed</button>
        <div class="otp-countdown-container" id="otp-countdown-container">
          Resend code in <span class="otp-countdown-timer" id="otp-countdown-timer">60</span>s
        </div>
        <button type="button" class="otp-resend-btn" id="otp-resend-btn" style="display: none;">Resend Code</button>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // Setup refs
  const card = overlay.querySelector('.otp-modal-card');
  const targetEmailEl = overlay.querySelector('#otp-target-email');
  const errorEl = overlay.querySelector('#otp-error-msg');
  const verifyBtn = overlay.querySelector('#otp-verify-btn');
  const closeBtn = overlay.querySelector('#otp-close-btn');
  const countdownContainer = overlay.querySelector('#otp-countdown-container');
  const countdownTimer = overlay.querySelector('#otp-countdown-timer');
  const resendBtn = overlay.querySelector('#otp-resend-btn');
  const inputs = overlay.querySelectorAll('.otp-digit-input');

  targetEmailEl.textContent = email;
  errorEl.style.display = 'none';
  errorEl.textContent = '';
  card.className = 'otp-modal-card';
  verifyBtn.innerText = 'Verify & Proceed';
  verifyBtn.disabled = true;

  // Clear inputs
  inputs.forEach(input => {
    input.value = '';
    input.classList.remove('filled');
  });

  // Open modal
  setTimeout(() => {
    overlay.classList.add('active');
    inputs[0].focus();
  }, 50);

  // Setup timers
  let timer = null;
  let secondsLeft = 60;

  function startCountdown() {
    clearInterval(timer);
    secondsLeft = 60;
    countdownContainer.style.display = 'block';
    resendBtn.style.display = 'none';
    countdownTimer.textContent = secondsLeft;

    timer = setInterval(() => {
      secondsLeft--;
      countdownTimer.textContent = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(timer);
        countdownContainer.style.display = 'none';
        resendBtn.style.display = 'inline-block';
      }
    }, 1000);
  }

  startCountdown();

  // Send request for OTP code
  async function triggerOtpSend() {
    try {
      const res = await fetch('otp-handler.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send', email, name })
      });
      const data = await res.json();
      if (!data.success) {
        showLocalError(data.message || 'Failed to send OTP.');
      }
    } catch (_) {
      showLocalError('Failed to send OTP. Please check your connection.');
    }
  }

  // Trigger send immediately on open
  triggerOtpSend();

  function showLocalError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 400);
  }

  // Auto-tabbing and keyboard control
  inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value;
      if (val) {
        input.classList.add('filled');
        if (index < 5) {
          inputs[index + 1].focus();
        }
      } else {
        input.classList.remove('filled');
      }
      checkIfAllFilled();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!input.value && index > 0) {
          inputs[index - 1].focus();
          inputs[index - 1].value = '';
          inputs[index - 1].classList.remove('filled');
        } else {
          input.value = '';
          input.classList.remove('filled');
        }
        checkIfAllFilled();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text').trim();
      if (/^\d{6}$/.test(text)) {
        for (let i = 0; i < 6; i++) {
          inputs[i].value = text[i];
          inputs[i].classList.add('filled');
        }
        verifyBtn.disabled = false;
        verifyBtn.focus();
        handleVerification();
      }
    });
  });

  function checkIfAllFilled() {
    let allFilled = true;
    inputs.forEach(i => {
      if (!i.value) allFilled = false;
    });
    verifyBtn.disabled = !allFilled;
  }

  async function handleVerification() {
    let otp = '';
    inputs.forEach(i => otp += i.value);

    verifyBtn.disabled = true;
    verifyBtn.innerText = 'Verifying...';
    errorEl.style.display = 'none';

    try {
      const res = await fetch('otp-handler.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', email, otp })
      });
      const data = await res.json();
      if (data.success) {
        card.classList.add('success');
        verifyBtn.innerText = 'Verified!';
        verifyBtn.style.background = '#2d9b4e';
        clearInterval(timer);
        
        // Success animation and modal close delay
        setTimeout(() => {
          overlay.classList.remove('active');
          setTimeout(() => {
            onVerifySuccess();
          }, 400);
        }, 1200);
      } else {
        showLocalError(data.message || 'Invalid code.');
        verifyBtn.disabled = false;
        verifyBtn.innerText = 'Verify & Proceed';
      }
    } catch (_) {
      showLocalError('Connection error. Please try again.');
      verifyBtn.disabled = false;
      verifyBtn.innerText = 'Verify & Proceed';
    }
  }

  // Clean up previous event listeners by cloning elements
  const newVerifyBtn = verifyBtn.cloneNode(true);
  verifyBtn.replaceWith(newVerifyBtn);
  verifyBtn = newVerifyBtn;

  const newResendBtn = resendBtn.cloneNode(true);
  resendBtn.replaceWith(newResendBtn);
  resendBtn = newResendBtn;

  const newCloseBtn = closeBtn.cloneNode(true);
  closeBtn.replaceWith(newCloseBtn);
  closeBtn = newCloseBtn;

  verifyBtn.addEventListener('click', handleVerification);

  resendBtn.addEventListener('click', () => {
    errorEl.style.display = 'none';
    startCountdown();
    triggerOtpSend();
  });

  function handleClose() {
    overlay.classList.remove('active');
    clearInterval(timer);
    if (onCancel) onCancel();
  }

  closeBtn.addEventListener('click', handleClose);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) handleClose();
  });
};

// Register certSubscribeForm submit listener
(function() {
  const certSubForm = document.getElementById('certSubscribeForm');
  if (certSubForm) {
    certSubForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let recaptchaResponse = '';
      const responseField = certSubForm.querySelector('[name="g-recaptcha-response"]') || certSubForm.querySelector('#g-recaptcha-response');
      if (responseField) {
        recaptchaResponse = responseField.value;
      }
      if (!recaptchaResponse && typeof grecaptcha !== 'undefined' && grecaptcha.enterprise) {
        try {
          recaptchaResponse = grecaptcha.enterprise.getResponse();
        } catch (_) {}
      }
      handleCertSubscribeWithToken(certSubForm, recaptchaResponse);
    });
  }
})();

async function handleCertSubscribeWithToken(form, recaptchaResponse) {
  const nameInput  = form.querySelector('#certSubName');
  const phoneInput = form.querySelector('#certSubPhone');
  const orgInput   = form.querySelector('#certSubOrg');
  const emailInput = form.querySelector('#certSubEmail');
  const msgEl      = form.querySelector('#certFormMsg');

  function showError(msg) {
    msgEl.style.display = 'block';
    msgEl.style.backgroundColor = 'rgba(255, 59, 48, 0.1)';
    msgEl.style.color = '#ff3b30';
    msgEl.innerText = msg;
  }
  function showSuccess(msg) {
    msgEl.style.display = 'block';
    msgEl.style.backgroundColor = 'rgba(52, 199, 89, 0.1)';
    msgEl.style.color = '#34c759';
    msgEl.innerText = msg;
  }

  // Validate name
  const name = nameInput.value.trim();
  if (name.length < 2 || !/^[a-zA-Z\s.'\-]+$/.test(name)) {
    showError('Please enter your full name (letters only).');
    nameInput.focus();
    return;
  }

  // Validate phone — 10-digit Indian mobile starting with 6-9
  const phoneRaw    = phoneInput.value.trim();
  const phoneDigits = phoneRaw.replace(/\D/g, '');
  const phone       = phoneDigits.startsWith('91') && phoneDigits.length === 12
    ? phoneDigits.slice(2)
    : phoneDigits;
  if (!/^[6-9][0-9]{9}$/.test(phone)) {
    showError('Please enter a valid 10-digit Indian mobile number (starting with 6–9).');
    phoneInput.focus();
    return;
  }

  // Validate organisation
  const org = orgInput ? orgInput.value.trim() : '';
  if (org.length < 2 || org.length > 150) {
    showError('Please enter your organisation name.');
    if (orgInput) orgInput.focus();
    return;
  }

  // Validate email — must be a company email (no personal/free providers)
  const email = emailInput.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Please enter a valid email address.');
    emailInput.focus();
    return;
  }
  const personalDomains = [
    'aol.com', 'rediffmail.com', 'protonmail.com', 'proton.me', 'tutanota.com', 'gmx.com', 'gmx.net',
    'mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'throwam.com', 'yopmail.com',
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'mail.com'
  ];
  const emailDomain = email.split('@')[1].toLowerCase();
  if (personalDomains.includes(emailDomain)) {
    showError('Please use your company email address. Personal email IDs are not accepted.');
    emailInput.focus();
    return;
  }

  if (!recaptchaResponse) {
    showError('Please complete the reCAPTCHA security check.');
    return;
  }

  const btn          = form.querySelector('button[type="submit"], button.g-recaptcha');
  const originalText = btn.innerText;
  btn.innerText  = 'Sending verification code...';
  btn.disabled   = true;

  // Open the OTP verification modal first
  window.openOtpVerificationModal({
    email,
    name,
    onVerifySuccess: async () => {
      btn.innerText  = 'Submitting...';
      try {
        const res = await fetch('save-subscriber.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone, org, email, recaptcha: recaptchaResponse })
        });

        const data = await res.json();

        if (data.success) {
          showSuccess(data.message || 'Subscribed successfully!');
          form.reset();
          setTimeout(() => {
            const modal = document.getElementById('certSubscribeModal');
            if (modal) modal.style.display = 'none';
            msgEl.style.display = 'none';
            document.body.style.overflow = '';
          }, 4000);
        } else {
          showError(data.message || 'Subscription failed. Please try again.');
        }
      } catch (e) {
        showError('Could not connect to the server. Please try again later.');
      } finally {
        btn.innerText = originalText;
        btn.disabled  = false;
      }
    },
    onCancel: () => {
      btn.innerText = originalText;
      btn.disabled = false;
    }
  });
}

// â”€â”€ Theme Toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
(function () {
  const btn = document.getElementById('themeToggleBtn');
  if (!btn) return;

  // Sync button icon to current theme
  function syncIcon() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const moon = btn.querySelector('.theme-icon-moon');
    const sun = btn.querySelector('.theme-icon-sun');
    if (moon) moon.style.display = isLight ? 'none' : 'block';
    if (sun) sun.style.display = isLight ? 'block' : 'none';
    btn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
  }

  btn.addEventListener('click', function () {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('vt-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('vt-theme', 'light');
    }
    syncIcon();
  });

  // Set icon on load
  syncIcon();
})();

// Command Engine Console Tab Controller
function switchConsoleTab(tabId, btn) {
  const container = btn.closest('.console-container');
  if (!container) return;
  
  // Update button active state
  container.querySelectorAll('.console-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  
  // Update panel display
  container.querySelectorAll('.console-panel').forEach(p => p.classList.remove('active'));
  const targetPanel = container.querySelector('#panel-' + tabId);
  if (targetPanel) {
    targetPanel.classList.add('active');
  }
  
  // Update status footer indicator dynamically based on view
  const statusEl = container.querySelector('.console-pulse-status');
  if (statusEl) {
    statusEl.innerText = tabId === 'executive' ? 'Continuous Defense Engaged' : 'AI Telemetry Stream Active';
  }
}
// â”€â”€ Magnetic Tech Cloud Interaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
(function () {
  const grid = document.querySelector('.tech-cloud-grid');
  if (!grid) return;

  const pills = grid.querySelectorAll('.tech-pill');
  const MAX_DIST = 250; // Threshold for interaction
  const MAGNETIC_STRENGTH = 0.35; // How much it pulls towards mouse
  const TILT_STRENGTH = 15; // Max degrees of tilt

  // Track mouse for spotlight
  grid.addEventListener('mousemove', (e) => {
    const rect = grid.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    grid.style.setProperty('--mouse-x', `${x}px`);
    grid.style.setProperty('--mouse-y', `${y}px`);

    // Handle each pill's transformation
    pills.forEach(pill => {
      const pRect = pill.getBoundingClientRect();
      const pCenterX = pRect.left + pRect.width / 2;
      const pCenterY = pRect.top + pRect.height / 2;

      const dx = e.clientX - pCenterX;
      const dy = e.clientY - pCenterY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < MAX_DIST) {
        // Calculate pull (stronger when closer)
        const power = (MAX_DIST - distance) / MAX_DIST;
        const tx = dx * power * MAGNETIC_STRENGTH;
        const ty = dy * power * MAGNETIC_STRENGTH;

        // Calculate tilt
        const rx = -dy / (pRect.height / 2) * TILT_STRENGTH * power;
        const ry = dx / (pRect.width / 2) * TILT_STRENGTH * power;

        pill.style.transform = `translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${1 + 0.05 * power})`;
      } else {
        pill.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1)';
      }
    });
  });

  grid.addEventListener('mouseleave', () => {
    pills.forEach(pill => {
      pill.style.transform = 'translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg) scale(1)';
    });
  });
})();

// Cookie Consent Banner
(function () {
  const consentKey = 'vt_cookie_consent';
  const prefKey = 'vt_cookie_preferences';
  const hasConsent = localStorage.getItem(consentKey);
  if (hasConsent === 'accepted' || hasConsent === 'rejected') return;

  const banner = document.createElement('div');
  banner.className = 'cookie-consent-banner';

  // Initially hide the banner
  banner.style.display = 'none';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-live', 'polite');
  banner.innerHTML = `
    <div class="cookie-consent-content">
      <p>
        We use cookies to improve your experience, analyze traffic, and personalize content.
        By clicking "Accept", you agree to our cookie usage.
      </p>
      <div class="cookie-consent-actions">
        <button type="button" class="cookie-btn cookie-btn-primary" id="cookieAcceptBtn">Accept</button>
        <button type="button" class="cookie-btn cookie-btn-outline" id="cookieRejectBtn">Decline</button>
        <a class="cookie-customise-link" href="cookie-preferences.html">Customise</a>
      </div>
    </div>
  `;

  // Append the banner to the body
  document.body.appendChild(banner);

  const acceptBtn = document.getElementById('cookieAcceptBtn');
  const rejectBtn = document.getElementById('cookieRejectBtn');

  function closeBanner(value) {
    localStorage.setItem(consentKey, value);
    if (value === 'accepted') {
      localStorage.setItem(prefKey, JSON.stringify({ necessary: true, analytics: true, advertising: true }));
    } else if (value === 'rejected') {
      localStorage.setItem(prefKey, JSON.stringify({ necessary: true, analytics: false, advertising: false }));
    }
    banner.classList.add('hide');
    setTimeout(() => banner.remove(), 250);
  }

  if (acceptBtn) acceptBtn.addEventListener('click', () => closeBanner('accepted'));
  if (rejectBtn) rejectBtn.addEventListener('click', () => closeBanner('rejected'));

  // Show the banner after a 2-minute delay
  setTimeout(() => {
    banner.style.display = 'block';
  }, 20000); // 20000 ms = 20 seconds
})();

// â”€â”€ Interactive Consulting Card Widgets â”€â”€
window.updateComplianceScore = function(checkbox) {
  const container = checkbox.closest('.compliance-widget');
  if (!container) return;
  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  let checkedCount = 0;
  checkboxes.forEach(cb => {
    if (cb.checked) checkedCount++;
  });
  const percentage = Math.round((checkedCount / checkboxes.length) * 100);
  const fill = container.querySelector('.gauge-fill');
  const val = container.querySelector('.comp-val');
  if (fill) fill.style.width = percentage + '%';
  if (val) val.textContent = percentage + '%';
};

window.updateCloudSavings = function(slider) {
  const container = slider.closest('.cloud-widget');
  if (!container) return;
  const val = parseInt(slider.value);
  const spendVal = container.querySelector('.spend-val');
  const savingsVal = container.querySelector('.savings-val');
  
  if (spendVal) spendVal.textContent = '$' + val.toLocaleString();
  if (savingsVal) {
    const savings = Math.round(val * 0.3); // 30% estimated savings
    savingsVal.textContent = '$' + savings.toLocaleString() + '/mo';
  }
};

// Allow pointer events to pass through card overlay layers so widgets remain interactive
document.querySelectorAll('.svc-overlay').forEach(function(el) {
  el.style.pointerEvents = 'none';
});

// â”€â”€ Live Industry Terminal Telemetry Simulator â”€â”€
(function () {
  const cards = document.querySelectorAll('.industry-card');
  if (!cards.length) return;

  const logsByIndustry = {
    bfsi: [
      "SECURE_GATEWAY: Verified TLS 1.3 handshake",
      "PCI_COMPLIANCE: Tokenizing transaction data...",
      "FRAUD_DETECT: AI pattern scan: 0 anomalies",
      "CORE_DB: Ledger integrity verified",
      "SWIFT_GUARD: Blocked unauthorized API call",
      "audit_trail: Checksum match verified"
    ],
    healthcare: [
      "EHR_ACCESS: Biometric MFA authorized",
      "DATA_PRIVACY: HIPAA encryption verified",
      "MEDICAL_IOT: Isolated VLAN monitor: NORMAL",
      "PACS_SERVER: DICOM payload scanned & clean",
      "TELEHEALTH: Encrypted video session initiated",
      "audit: Patient logs backup complete"
    ],
    manufacturing: [
      "OT_GUARD: ICS SCADA air-gap verified",
      "PLC_INTEGRITY: Firmware signature matches baseline",
      "EDGE_DEFENDER: Blocked Modbus register write",
      "SUPPLY_CHAIN: Payload integrity checksum: OK",
      "SAFETY_SHIELD: Network isolation engaged",
      "telemetry: Smart factory sensor array: SECURE"
    ],
    saas: [
      "CI_CD: Static analysis: 0 vulnerabilities",
      "API_SHIELD: Rate-limiting running (14k req/s)",
      "TENANT_ISOLATION: KMS key rotation completed",
      "DDOS_SHIELD: Traffic scrubbing active: NORMAL",
      "WAF_RULE: Blocked OWASP Top 10 attempt",
      "iam: Auditing temporary session keys"
    ],
    education: [
      "IDP: Student SAML assertion validated",
      "CONTENT_FILTER: Active classification active",
      "WIFI_SECURE: WPA3 Enterprise authorization: OK",
      "FERPA_LOG: Audited student directory queries",
      "LMS_SECURE: DDoS mitigation active",
      "sys: Dynamic classroom isolation verified"
    ],
    enterprise: [
      "EDR: Active endpoint telemetry streaming",
      "ZERO_TRUST: Re-evaluating access policies",
      "MFA_GATEWAY: Contextual sign-in risk: LOW",
      "SIEM_ALERT: Correlated 4.2M events: 0 alerts",
      "AD_GUARD: LDAP query audit completed",
      "patch_mgr: All critical assets updated"
    ],
    gov: [
      "CRYPT_LAYER: Post-quantum crypto active",
      "ACCESS_CONTROL: Role-based clearance checked",
      "PORTAL_WAF: SQLi/XSS inspection: 100% clean",
      "AUDIT_CHAIN: WORM storage integrity: INTACT",
      "NATIONAL_SHIELD: Boundary defense active",
      "sys: CERT-In compliance report generated"
    ],
    energy: [
      "SCADA_DIAL: Grid sensor telemetry encrypted",
      "PERIMETER: Geofenced perimeter security: INTACT",
      "OT_IDS: Deep packet inspection on IEC 61850",
      "FAILSAFE: Backup telemetry systems: STANDBY",
      "RTU_VERIFY: Cryptographic hardware key match: OK",
      "sys: Wind turbine control link secure"
    ]
  };

  const cardIntervals = new Map();

  cards.forEach(card => {
    const terminal = card.querySelector('.industry-terminal');
    if (!terminal) return;

    const indName = terminal.getAttribute('data-industry');
    const body = terminal.querySelector('.terminal-body');
    const logs = logsByIndustry[indName] || ["Telemetry monitoring..."];

    card.addEventListener('mouseenter', () => {
      if (cardIntervals.has(card)) return;

      const interval = setInterval(() => {
        const randomLog = logs[Math.floor(Math.random() * logs.length)];
        
        let type = 'info';
        if (randomLog.includes('SYSTEM') || randomLog.includes('sys:') || randomLog.includes('audit')) {
          type = 'sys';
        } else if (randomLog.includes('Blocked') || randomLog.includes('anomaly') || randomLog.includes('alert')) {
          type = 'alert';
        }

        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0];

        const prefix = type === 'sys' ? '[SYS]' : type === 'alert' ? '[WARN]' : '[OK]';
        const formattedLog = `[${timeStr}] ${prefix} ${randomLog.split(': ').pop()}`;

        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        line.textContent = formattedLog;

        body.appendChild(line);

        const lines = body.querySelectorAll('.terminal-line');
        if (lines.length > 4) {
          lines[0].remove();
        }

        body.scrollTop = body.scrollHeight;
      }, 1000);

      cardIntervals.set(card, interval);
    });

    card.addEventListener('mouseleave', () => {
      if (cardIntervals.has(card)) {
        clearInterval(cardIntervals.get(card));
        cardIntervals.delete(card);
      }
    });
  });
})();

// Home industries: inject holographic beam/pedestal elements for QMS-like hover effect
(function () {
  const cards = document.querySelectorAll('.home-page .cyber-industries-section .industry-card');
  if (!cards.length) return;
  cards.forEach((card) => {
    if (!card.querySelector('.holo-beam-home')) {
      const beam = document.createElement('div');
      beam.className = 'holo-beam-home';
      card.appendChild(beam);
    }
    if (!card.querySelector('.holo-pedestal-home')) {
      const pedestal = document.createElement('div');
      pedestal.className = 'holo-pedestal-home';
      card.appendChild(pedestal);
    }
  });
})();





// Home hero interactive spotlight/parallax controller
(function () {
  var heroBg = document.getElementById('heroInteractiveBg');
  if (!heroBg) return;

  var hero = heroBg.closest('.hero');
  if (!hero) return;

  function setPos(clientX, clientY) {
    var r = hero.getBoundingClientRect();
    var x = ((clientX - r.left) / Math.max(1, r.width)) * 100;
    var y = ((clientY - r.top) / Math.max(1, r.height)) * 100;
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    hero.style.setProperty('--hx', x.toFixed(2) + '%');
    hero.style.setProperty('--hy', y.toFixed(2) + '%');
  }

  hero.addEventListener('mousemove', function (e) { setPos(e.clientX, e.clientY); });
  hero.addEventListener('touchmove', function (e) {
    if (!e.touches || !e.touches[0]) return;
    setPos(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
})();

// Testimonials Carousel Logic
(function () {
  const track = document.getElementById('tmTrack');
  const viewport = track ? track.parentElement : null; // Get the viewport element
  const prevBtn = document.getElementById('tmPrev');
  const nextBtn = document.getElementById('tmNext');
  const dotsContainer = document.getElementById('tmDots');

  if (prevBtn) prevBtn.remove();
  if (nextBtn) nextBtn.remove();

  if (!track || !viewport || !dotsContainer) return;

  const slides = Array.from(track.children);
  const AUTO_ROTATE_MS = 4500;
  let currentIndex = 0; // Start with index 0
  let autoRotateTimer;

  slides.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.classList.add('tm-dot');
    if (i === currentIndex) dot.classList.add('active');
    dot.addEventListener('click', () => {
      goToSlide(i);
      resetAutoRotate();
    });
    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.children);

  function updateActiveDot() {
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentIndex));
    slides.forEach((slide, i) => slide.classList.toggle('active', i === currentIndex));
  }

  function startAutoRotate() {
    if (slides.length <= 1) return;
    clearInterval(autoRotateTimer);
    autoRotateTimer = setInterval(() => {
      goToSlide(currentIndex + 1);
    }, AUTO_ROTATE_MS);
  }

  function stopAutoRotate() {
    clearInterval(autoRotateTimer);
  }

  function resetAutoRotate() {
    stopAutoRotate();
    startAutoRotate();
  }

  function goToSlide(index) {
    if (slides.length === 0) return;

    // Ensure index is within bounds
    if (index < 0) index = slides.length - 1;
    if (index >= slides.length) index = 0;

    currentIndex = index;
    updateActiveDot();

    // Calculate scroll position to center the target slide.
    const targetSlide = slides[currentIndex];
    if (targetSlide) {
      viewport.scroll({
        left: targetSlide.offsetLeft - (viewport.offsetWidth - targetSlide.offsetWidth) / 2, // Center the slide
        behavior: 'smooth'
      });
    }
  }

  // Update active dot when user scrolls manually
  let scrollTimeout;
  viewport.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      if (slides.length === 0) return;
      const scrollLeft = viewport.scrollLeft;
      const viewportCenter = scrollLeft + viewport.offsetWidth / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      slides.forEach((slide, i) => {
        const slideCenter = slide.offsetLeft + slide.offsetWidth / 2;
        const distance = Math.abs(viewportCenter - slideCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      });

      if (closestIndex !== currentIndex) {
        currentIndex = closestIndex;
        updateActiveDot();
      }

      resetAutoRotate();
    }, 150); // Debounce scroll event
  });

  viewport.addEventListener('mouseenter', stopAutoRotate);
  viewport.addEventListener('mouseleave', startAutoRotate);
  viewport.addEventListener('touchstart', stopAutoRotate, { passive: true });
  viewport.addEventListener('touchend', resetAutoRotate, { passive: true });

  window.addEventListener('resize', () => {
    // On resize, re-center the current slide
    goToSlide(currentIndex);
  }
);

  // Initial update
  setTimeout(() => {
    // Ensure slides are rendered before calculating positions
    goToSlide(currentIndex);
    startAutoRotate();
  }, 100);
})();

// Prevent zoom on laptop/desktop (Ctrl+Scroll and Ctrl+/-)
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=')) {
    e.preventDefault();
  }
});

document.addEventListener('wheel', function(e) {
  if (e.ctrlKey) {
    e.preventDefault();
  }
}, { passive: false });

// ==========================================================================
// Delayed Popup Modal (Triggers after 2 minutes on home page)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const delayedModal = document.getElementById('delayedPopupModal');
  const closeDelayedBtn = document.getElementById('closeDelayedPopup');
  
  if (delayedModal) {
    // 120,000 milliseconds = 2 minutes
    const popupDelay = 120000; 

    setTimeout(() => {
      if (!sessionStorage.getItem('vedtamPopupShown')) {
        delayedModal.classList.add('active');
        document.body.classList.add('body-no-scroll');
        sessionStorage.setItem('vedtamPopupShown', 'true');
      }
    }, popupDelay);

    const closeDelayedModal = () => {
      delayedModal.classList.remove('active');
      document.body.classList.remove('body-no-scroll');
    };

    if (closeDelayedBtn) {
      closeDelayedBtn.addEventListener('click', closeDelayedModal);
    }

    delayedModal.addEventListener('click', (e) => {
      if (e.target === delayedModal) {
        closeDelayedModal();
      }
    });
  }
});
