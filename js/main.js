/* VOLT - main.js
   Smooth scroll (Lenis) + GSAP/ScrollTrigger, canvas hero, curseur, carte. */

(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

  // PRELOADER
  const loader = document.getElementById("loader");
  const fill = document.getElementById("loaderFill");
  const count = document.getElementById("loaderCount");

  function hideLoader(done) {
    if (hasGSAP) {
      gsap.to(loader, {
        yPercent: -100, duration: 0.9, ease: "power4.inOut", delay: 0.25,
        onComplete: () => { loader.style.display = "none"; done(); }
      });
    } else {
      // pas de GSAP : on masque le rideau en CSS
      loader.style.transition = "transform .7s ease, opacity .7s ease";
      loader.style.transform = "translateY(-100%)";
      setTimeout(() => { loader.style.display = "none"; done(); }, 700);
    }
  }

  function runLoader(done) {
    if (prefersReduced || !loader) { if (loader) loader.style.display = "none"; done(); return; }
    let p = 0;
    const tick = () => {
      p += Math.random() * 14 + 4;
      if (p >= 100) p = 100;
      if (fill) fill.style.width = p + "%";
      if (count) count.textContent = Math.round(p);
      if (p < 100) setTimeout(tick, 90 + Math.random() * 90);
      else hideLoader(done);
    };
    tick();
  }

  // LENIS SMOOTH SCROLL
  let lenis = null;
  function initLenis() {
    if (prefersReduced || typeof Lenis === "undefined") return;
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on("scroll", () => { if (hasGSAP) ScrollTrigger.update(); });
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // liens d'ancre (le menu mobile gère les siens à part)
    document.querySelectorAll('a[href^="#"]:not([data-menu-link])').forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        if (id.length > 1) {
          const target = document.querySelector(id);
          if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -20, duration: 1.4 }); }
        }
      });
    });
  }

  // CUSTOM CURSOR (magnetic + hover grow)
  function initCursor() {
    if (!isFinePointer) return;
    const dot = document.getElementById("cursorDot");
    if (!dot) return;
    let dx = innerWidth / 2, dy = innerHeight / 2;
    dot.style.transform = `translate(${dx}px, ${dy}px)`;

    // Étincelles électriques (crackle) : jaillissent quand la souris bouge
    const sparkColors = ["var(--spark)", "var(--volt)", "var(--spark-soft)"];
    let lastSpark = 0;
    function spawnSparks(x, y, n) {
      for (let i = 0; i < n; i++) {
        const s = document.createElement("span");
        s.className = "spark";
        s.style.left = (x + (Math.random() - 0.5) * 10) + "px";
        s.style.top = (y + (Math.random() - 0.5) * 10) + "px";
        s.style.background = sparkColors[(Math.random() * sparkColors.length) | 0];
        s.style.setProperty("--rot", (Math.random() * 360) + "deg");
        s.style.setProperty("--dist", (8 + Math.random() * 18) + "px");
        s.style.setProperty("--dur", (0.35 + Math.random() * 0.35) + "s");
        document.body.appendChild(s);
        s.addEventListener("animationend", () => s.remove());
      }
    }

    window.addEventListener("mousemove", (e) => {
      dx = e.clientX; dy = e.clientY;
      dot.style.transform = `translate(${dx}px, ${dy}px)`;
      if (prefersReduced) return;
      const now = performance.now();
      const speed = Math.hypot(e.movementX, e.movementY);
      if (speed > 6 && now - lastSpark > 28) {
        lastSpark = now;
        spawnSparks(dx, dy, speed > 30 ? 2 : 1);
      }
    });
  }

  // MAGNETIC BUTTONS
  function initMagnetic() {
    if (!isFinePointer || !hasGSAP) return;
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        gsap.to(el, { x: x * 0.4, y: y * 0.4, duration: 0.6, ease: "power3.out" });
      });
      el.addEventListener("mouseleave", () => {
        gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
      });
    });
  }

  // CARD SPOTLIGHT (suit la souris)
  function initCardSpotlight() {
    document.querySelectorAll("[data-card]").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${e.clientX - r.left}px`);
        card.style.setProperty("--my", `${e.clientY - r.top}px`);
      });
    });
  }

  // HERO - CANVAS ÉLECTRIQUE (arcs qui suivent la souris)
  function initBolts() {
    if (prefersReduced) return;
    const canvas = document.getElementById("bolts");
    const ctx = canvas.getContext("2d");
    let w, h, dpr;
    const mouse = { x: -999, y: -999, active: false };
    const nodes = [];
    const NODE_COUNT = 60;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < NODE_COUNT; i++) {
      nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 });
    }

    const hero = document.getElementById("hero");
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.active = true;
    });
    hero.addEventListener("mouseleave", () => { mouse.active = false; });

    // Dessine un éclair fractal entre deux points
    function lightning(x1, y1, x2, y2, displace, alpha) {
      if (displace < 4) {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = `rgba(255, 230, 0, ${alpha})`;
        ctx.lineWidth = 1; ctx.stroke();
        ctx.strokeStyle = `rgba(25, 227, 255, ${alpha * 0.5})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      } else {
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * displace;
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * displace;
        lightning(x1, y1, mx, my, displace / 2, alpha);
        lightning(mx, my, x2, y2, displace / 2, alpha);
      }
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }

      // liens entre noeuds proches
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 130) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.06 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
        // point
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 230, 0, 0.5)";
        ctx.fill();
      }

      // arcs électriques vers la souris
      if (mouse.active) {
        const near = nodes
          .map((n) => ({ n, d: Math.hypot(n.x - mouse.x, n.y - mouse.y) }))
          .filter((o) => o.d < 240)
          .sort((a, b) => a.d - b.d)
          .slice(0, 5);
        for (const o of near) {
          lightning(mouse.x, mouse.y, o.n.x, o.n.y, 26, 0.55 * (1 - o.d / 240));
        }
        // halo souris
        const g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 60);
        g.addColorStop(0, "rgba(255,230,0,0.18)"); g.addColorStop(1, "rgba(255,230,0,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 60, 0, Math.PI * 2); ctx.fill();
      }

      requestAnimationFrame(frame);
    }
    frame();
  }

  // SPLIT TEXT (titres en caractères animables)
  function splitText(el) {
    const text = el.innerHTML;
    const parts = text.split(/<br\s*\/?>/i); // une ligne par <br>
    el.innerHTML = "";
    parts.forEach((part) => {
      const wrap = document.createElement("span");
      wrap.className = "split-line";
      wrap.style.display = "block";
      wrap.style.overflow = "hidden";
      wrap.style.paddingBottom = "0.16em";
      wrap.style.marginBottom = "-0.16em";

      // mot par mot pour éviter les coupures au milieu d'un mot
      const words = part.trim().split(/\s+/);
      words.forEach((word, wi) => {
        const wordSpan = document.createElement("span");
        wordSpan.style.display = "inline-block";
        wordSpan.style.whiteSpace = "nowrap";
        Array.from(word).forEach((ch) => {
          const s = document.createElement("span");
          s.className = "split-char";
          s.textContent = ch;
          wordSpan.appendChild(s);
        });
        wrap.appendChild(wordSpan);
        if (wi < words.length - 1) wrap.appendChild(document.createTextNode(" "));
      });
      el.appendChild(wrap);
    });
    return el.querySelectorAll(".split-char");
  }

  // ANIMATIONS SCROLL (GSAP)
  function initScrollAnimations() {
    if (!hasGSAP) {
      // fallback : tout visible
      document.querySelectorAll("[data-reveal]").forEach((el) => { el.style.opacity = 1; el.style.transform = "none"; });
      return;
    }

    // Hero : titre en lignes
    gsap.set("[data-hero-line]", { yPercent: 110 });
    const heroTl = gsap.timeline({ delay: 0.15 });
    heroTl.to("[data-hero-line]", {
            yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.12,
            onComplete: () => { document.querySelectorAll(".hero__title .line").forEach((l) => { l.style.overflow = "visible"; }); }
          })
          .to("[data-reveal]", { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08 }, "-=0.7");

    // Reveals génériques (hors hero)
    gsap.utils.toArray("[data-reveal]").forEach((el) => {
      if (el.closest(".hero")) return;
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

    // Titres splittés
    gsap.utils.toArray("[data-split]").forEach((el) => {
      const chars = splitText(el);
      gsap.set(chars, { yPercent: 110 });
      gsap.to(chars, {
        yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.02,
        scrollTrigger: { trigger: el, start: "top 85%" },
        // overflow visible après coup, sinon le glow du CTA est rogné
        onComplete: () => { el.querySelectorAll(".split-line").forEach((l) => { l.style.overflow = "visible"; }); }
      });
    });

    // Parallaxe images projets
    gsap.utils.toArray("[data-parallax-img]").forEach((img) => {
      gsap.fromTo(img, { yPercent: -12 }, {
        yPercent: 12, ease: "none",
        scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true }
      });
    });

    // Fil conducteur : tracé du SVG au scroll
    const path = document.getElementById("threadPath");
    if (path) {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
      gsap.to(path, {
        strokeDashoffset: 0, ease: "none",
        scrollTrigger: { trigger: ".process__wrap", start: "top 70%", end: "bottom 80%", scrub: 1 }
      });
    }

    // Marquee kinétique : boucle continue + réactif à la vitesse de scroll (boost + skew)
    const marquee = document.getElementById("marquee");
    if (marquee && !prefersReduced) {
      const base = 1; // vitesse de croisière (timeScale)
      const loop = gsap.to(marquee, { xPercent: -50, ease: "none", duration: 18, repeat: -1 });
      loop.timeScale(base);

      let dir = 1, vel = 0, skew = 0;
      ScrollTrigger.create({
        trigger: ".marquee", start: "top bottom", end: "bottom top",
        onUpdate: (self) => { vel = self.getVelocity(); }
      });

      gsap.ticker.add(() => {
        if (Math.abs(vel) > 1) dir = vel < 0 ? -1 : 1;        // le sens suit le scroll
        // boost proportionnel à la vitesse de scroll, retour progressif au régime de croisière
        const target = dir * (base + gsap.utils.clamp(0, 5, Math.abs(vel) / 200));
        loop.timeScale(loop.timeScale() + (target - loop.timeScale()) * 0.08);
        // skew kinétique borné, revient à 0 quand le scroll se calme
        const skewTarget = gsap.utils.clamp(-14, 14, vel / 180);
        skew += (skewTarget - skew) * 0.1;
        gsap.set(marquee, { skewX: skew });
        vel *= 0.9; // amortissement de la vitesse mémorisée
      });
    } else if (marquee) {
      // reduced-motion : simple déplacement lié au scroll, pas de boucle auto
      gsap.to(marquee, {
        xPercent: -50, ease: "none",
        scrollTrigger: { trigger: ".marquee", start: "top bottom", end: "bottom top", scrub: 1 }
      });
    }

  }

  // SERVICE CARDS - entrée 3D "mise sous tension"
  function initServiceCards() {
    const cards = Array.prototype.slice.call(document.querySelectorAll(".services [data-card]"));
    if (!cards.length) return;

    if (!hasGSAP || prefersReduced) {
      cards.forEach((c) => { c.style.opacity = 1; });
      return;
    }

    const grid = document.querySelector(".services__grid");
    if (grid) grid.style.perspective = "1300px";

    // transition CSS coupée le temps de l'anim, sinon elle bouffe le transform
    cards.forEach((c) => { c.style.transition = "none"; });

    gsap.set(cards, { opacity: 0, y: 50, rotateX: -20, scale: 0.94, transformOrigin: "50% 100%" });
    const icons = cards.map((c) => c.querySelector(".card__icon")).filter(Boolean);
    gsap.set(icons, { scale: 0, rotate: -25, opacity: 0 });

    ScrollTrigger.create({
      trigger: grid,
      start: "top 80%",
      once: true,
      onEnter: () => {
        const tl = gsap.timeline();

        // montée + redressement 3D en cascade
        tl.to(cards, {
          opacity: 1, y: 0, rotateX: 0, scale: 1,
          duration: 1.15, ease: "power4.out", stagger: 0.13,
          onComplete: () => {
            gsap.set(cards, { clearProps: "transform" });
            cards.forEach((c) => { c.style.transition = ""; }); // on rend le hover au CSS
          }
        });

        // pop des icônes
        tl.to(icons, {
          opacity: 1, scale: 1, rotate: 0,
          duration: 0.7, ease: "back.out(2.2)", stagger: 0.13
        }, 0.25);

        // flash de glow par carte
        cards.forEach((card, i) => {
          tl.fromTo(card,
            { boxShadow: "0 0 0px 0px rgba(255,230,0,0)" },
            {
              boxShadow: "0 0 45px -6px rgba(255,230,0,.55)",
              duration: 0.4, yoyo: true, repeat: 1, ease: "power2.inOut",
              onComplete: () => gsap.set(card, { clearProps: "boxShadow" })
            }, 0.3 + i * 0.13);
        });
      }
    });
  }

  // COMPTEURS
  function initCounters() {
    document.querySelectorAll("[data-count]").forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || "";
      const obj = { v: 0 };
      const animate = () => {
        if (hasGSAP) {
          gsap.to(obj, {
            v: target, duration: 2, ease: "power2.out",
            onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("fr-FR") + suffix; },
            scrollTrigger: { trigger: el, start: "top 90%", once: true }
          });
        } else {
          el.textContent = target.toLocaleString("fr-FR") + suffix;
        }
      };
      animate();
    });
  }

  // NAV (hide on scroll down, show on up + scrolled bg)
  function initNav() {
    const nav = document.getElementById("nav");
    const progress = document.getElementById("scrollProgress");
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      nav.classList.toggle("is-scrolled", y > 40);
      if (y > lastY && y > 400) nav.classList.add("is-hidden");
      else nav.classList.remove("is-hidden");
      lastY = y;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.width = (y / max) * 100 + "%";
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // SWITCH / INTERRUPTEUR
  function initSwitch() {
    const sw = document.getElementById("switch");
    const cta = document.getElementById("contact");
    if (!sw) return;
    const toggle = () => {
      const on = sw.classList.toggle("is-on");
      cta.classList.toggle("is-on", on);
      // le glow permanent est en CSS (.cta.is-on), ici juste un pic au clic
      if (on && hasGSAP && !prefersReduced) {
        gsap.fromTo(".cta__title",
          { textShadow: "0 0 70px rgba(255,230,0,0.9)" },
          {
            textShadow: "0 0 45px rgba(255,230,0,0.5)", duration: 0.5, ease: "power2.out",
            onComplete: () => gsap.set(".cta__title", { clearProps: "textShadow" })
          });
      }
    };
    sw.addEventListener("click", toggle);
    sw.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } });
  }

  // MENU MOBILE (burger)
  function initMenu() {
    const burger = document.getElementById("burger");
    const menu = document.getElementById("menu");
    if (!burger || !menu) return;
    const setOpen = (open) => {
      burger.classList.toggle("is-open", open);
      menu.classList.toggle("is-open", open);
      document.body.classList.toggle("menu-open", open);
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      if (lenis) { open ? lenis.stop() : lenis.start(); }
      document.body.style.overflow = open ? "hidden" : "";
    };
    burger.addEventListener("click", () => setOpen(!menu.classList.contains("is-open")));
    menu.querySelectorAll("[data-menu-link]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href");
        const target = document.querySelector(id);
        setOpen(false);
        if (target && lenis) { e.preventDefault(); setTimeout(() => lenis.scrollTo(target, { offset: -20, duration: 1.4 }), 350); }
      });
    });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") setOpen(false); });
  }

  // FAQ - accordéon animé (height + exclusif)
  function initFaq() {
    const items = document.querySelectorAll(".faq__item");
    items.forEach((item) => {
      const summary = item.querySelector("summary");
      const body = item.querySelector(".faq__body");
      summary.addEventListener("click", (e) => {
        e.preventDefault();
        const isOpen = item.hasAttribute("open");
        // ferme les autres
        items.forEach((other) => {
          if (other !== item && other.hasAttribute("open")) {
            const ob = other.querySelector(".faq__body");
            if (hasGSAP && !prefersReduced) gsap.to(ob, { height: 0, duration: 0.4, ease: "power2.inOut", onComplete: () => other.removeAttribute("open") });
            else other.removeAttribute("open");
          }
        });
        if (isOpen) {
          if (hasGSAP && !prefersReduced) gsap.to(body, { height: 0, duration: 0.4, ease: "power2.inOut", onComplete: () => item.removeAttribute("open") });
          else item.removeAttribute("open");
        } else {
          item.setAttribute("open", "");
          if (hasGSAP && !prefersReduced) {
            gsap.fromTo(body, { height: 0 }, { height: "auto", duration: 0.45, ease: "power2.out" });
          }
        }
      });
    });
  }

  // CARTE LEAFLET (zone d'intervention, thème sombre)
  function initMap() {
    const el = document.getElementById("map");
    if (!el || typeof L === "undefined") return;

    const center = [48.2, -2.9]; // centre de la Bretagne
    const map = L.map(el, { center, zoom: 8, scrollWheelZoom: false, zoomControl: true, attributionControl: true });

    // Tuiles sombres (CARTO dark matter)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19, subdomains: "abcd"
    }).addTo(map);

    // Zone de couverture (cercle néon)
    L.circle(center, {
      radius: 130000, color: "#ffe600", weight: 1.5, fillColor: "#ffe600", fillOpacity: 0.08
    }).addTo(map);

    // Villes desservies
    const cities = [
      { name: "Rennes", ll: [48.117, -1.677], main: true },
      { name: "Brest", ll: [48.390, -4.486] },
      { name: "Quimper", ll: [47.996, -4.097] },
      { name: "Vannes", ll: [47.658, -2.760] },
      { name: "Lorient", ll: [47.748, -3.367] },
      { name: "Saint-Malo", ll: [48.649, -2.026] }
    ];
    cities.forEach((c) => {
      const dot = L.divIcon({
        className: "volt-pin",
        html: `<span style="display:block;width:${c.main ? 16 : 11}px;height:${c.main ? 16 : 11}px;border-radius:50%;background:#ffe600;box-shadow:0 0 ${c.main ? 18 : 10}px #ffe600;border:2px solid #060608;"></span>`,
        iconSize: [16, 16], iconAnchor: [8, 8]
      });
      L.marker(c.ll, { icon: dot }).addTo(map).bindPopup(`<strong>${c.name}</strong><br>Intervention rapide`);
    });

    // Active le scroll-zoom seulement après un clic (évite de piéger le scroll)
    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    setTimeout(() => { map.invalidateSize(); if (hasGSAP) ScrollTrigger.refresh(); }, 300);
  }

  // BOOT
  function boot() {
    initLenis();
    initCursor();
    initMagnetic();
    initCardSpotlight();
    initBolts();
    initScrollAnimations();
    initServiceCards();
    initCounters();
    initNav();
    initSwitch();
    initMenu();
    initFaq();
    initMap();
    if (hasGSAP) ScrollTrigger.refresh();
  }

  window.addEventListener("DOMContentLoaded", () => {
    runLoader(boot);
  });

  // Refresh ScrollTrigger après le chargement complet (fonts, images)
  window.addEventListener("load", () => {
    if (hasGSAP) ScrollTrigger.refresh();
  });
})();
