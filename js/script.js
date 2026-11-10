/* =========================================================
   ROYAL PICTURES — motion & interactions (vanilla JS, aucune dépendance)
   ========================================================= */
(function(){
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function(s, c){ return (c || document).querySelector(s); };
  var $$ = function(s, c){ return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var lerp = function(a, b, t){ return a + (b - a) * t; };
  var clamp = function(v, a, b){ return Math.min(b, Math.max(a, v)); };

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- split text en mots ---------- */
  $$('[data-split]').forEach(function(el){
    var i = 0;
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    // les <br> éventuels sont conservés (retours à la ligne voulus sur grand écran)
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(function(seg){
      var tmp = document.createElement('div'); tmp.innerHTML = seg;
      return tmp.textContent.trim().split(/\s+/).filter(Boolean).map(function(w){
        return '<span class="w" aria-hidden="true"><span style="--i:' + (i++) + '">' + w + '</span></span>';
      }).join(' ');
    }).join(' <br>');
  });

  /* ---------- mise au point des photos (flou -> net) ---------- */
  $$('img.lq').forEach(function(img){
    function done(){ img.classList.add('is-loaded'); }
    if(img.complete && img.naturalWidth) done();
    else { img.addEventListener('load', done); img.addEventListener('error', done); }
  });

  /* ---------- intro : l'objectif s'ouvre sur le hero ---------- */
  var intro = $('#intro');
  var body = document.body;
  function startHero(){
    body.classList.add('is-ready');
    $$('.hero [data-split], .hero .fade-up').forEach(function(el){ el.classList.add('is-in'); });
    startSlides();
  }
  function openIntro(){
    intro.classList.add('is-open');
    body.classList.remove('is-loading');
    setTimeout(startHero, 450);
    setTimeout(function(){ intro.classList.add('is-gone'); }, 2000);
  }
  var seen = false;
  try { seen = sessionStorage.getItem('rp-intro') === '1'; sessionStorage.setItem('rp-intro', '1'); } catch(e){}
  if(reduce){
    intro.classList.add('is-gone'); body.classList.remove('is-loading'); startHero();
  } else {
    var minDelay = seen ? 350 : 1500;
    var t0 = performance.now();
    var first = $('.hero__slide img');
    var ready = new Promise(function(res){
      if(first.complete) return res();
      first.addEventListener('load', res); first.addEventListener('error', res);
      setTimeout(res, 3000);
    });
    ready.then(function(){
      setTimeout(openIntro, Math.max(0, minDelay - (performance.now() - t0)));
    });
  }

  /* ---------- hero : diaporama ---------- */
  var slides = $$('.hero__slide');
  var dotsWrap = $('#heroDots');
  var cap = $('#heroCap');
  var current = 0, timer = null, DUR = 6500;
  slides.forEach(function(s, i){
    var b = document.createElement('button');
    b.className = 'hero__dot'; b.setAttribute('aria-label', 'Photo ' + (i + 1) + ' : ' + s.dataset.cap);
    b.style.setProperty('--dur', DUR + 'ms');
    b.addEventListener('click', function(){ goSlide(i); });
    dotsWrap.appendChild(b);
  });
  var dots = $$('.hero__dot');
  var wipe = $('#heroWipe'), firstRun = true;
  function goSlide(n){
    var target = (n + slides.length) % slides.length;
    if(!firstRun && target === current) return;
    if(!firstRun){
      slides.forEach(function(sl){ sl.classList.remove('is-prev'); });
      slides[current].classList.add('is-prev');
      slides[current].classList.remove('is-active');
      if(wipe && !reduce){ wipe.classList.remove('is-run'); void wipe.offsetWidth; wipe.classList.add('is-run'); }
    }
    firstRun = false;
    current = target;
    var s = slides[current];
    var img = $('img', s);
    if(img.loading === 'lazy'){ img.loading = 'eager'; }
    // relance l'animation Ken Burns
    void img.offsetWidth;
    s.classList.add('is-active');
    dots.forEach(function(d, i){
      d.classList.remove('is-active');
      d.classList.toggle('is-done', i < current);
    });
    void dots[current].offsetWidth;
    dots[current].classList.add('is-active');
    cap.classList.add('is-swap');
    setTimeout(function(){ cap.textContent = s.dataset.cap; cap.classList.remove('is-swap'); }, 400);
    clearTimeout(timer);
    if(!reduce) timer = setTimeout(function(){ goSlide(current + 1); }, DUR);
    // précharge la suivante
    var next = $('img', slides[(current + 1) % slides.length]); if(next) next.loading = 'eager';
  }
  function startSlides(){ goSlide(0); }

  /* ---------- reveal au scroll ---------- */
  var revealTargets = $$('[data-split]:not(.hero [data-split]), .fade-up:not(.hero .fade-up), .img-reveal, .kicker, .value, .why__item');
  if('IntersectionObserver' in window && !reduce){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: .18, rootMargin: '0px 0px -8% 0px' });
    revealTargets.forEach(function(el){ io.observe(el); });
  } else {
    revealTargets.forEach(function(el){ el.classList.add('is-in'); });
  }

  /* ---------- slogan du pied de page : on observe le footer (le texte masqué n'est jamais « visible ») ---------- */
  var footer = $('.footer'), footerBig = $('.footer__big');
  if(footer && footerBig){
    if('IntersectionObserver' in window && !reduce){
      var fio = new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ footerBig.classList.add('is-in'); fio.disconnect(); } });
      }, { threshold: .25 });
      fio.observe(footer);
    } else footerBig.classList.add('is-in');
  }

  /* ---------- tuiles du portfolio en cascade ---------- */
  var tiles = $$('.tile');
  if('IntersectionObserver' in window && !reduce){
    var batch = [], batchTimer = null;
    var tio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){ if(e.isIntersecting){ batch.push(e.target); tio.unobserve(e.target); } });
      clearTimeout(batchTimer);
      batchTimer = setTimeout(function(){
        batch.forEach(function(t, i){ t.style.setProperty('--d', (i * 0.08) + 's'); t.classList.add('is-in'); });
        batch = [];
      }, 30);
    }, { threshold: .1 });
    tiles.forEach(function(t){ tio.observe(t); });
  } else { tiles.forEach(function(t){ t.classList.add('is-in'); }); }

  /* ---------- navigation ---------- */
  var nav = $('#nav');
  var progressBar = $('#progressBar');
  var lastY = 0;
  var menuOpen = false;

  var toggle = $('#navToggle'), menu = $('#navMobile');
  function setMenu(open){
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.setAttribute('aria-hidden', !open);
    body.style.overflow = open ? 'hidden' : '';
  }
  toggle.addEventListener('click', function(){ setMenu(!menuOpen); });
  $$('a', menu).forEach(function(a){ a.addEventListener('click', function(){ setMenu(false); }); });

  var navLinks = $$('.nav__links a');
  if('IntersectionObserver' in window){
    var sio = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          navLinks.forEach(function(a){ a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id); });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['apropos','expertise','portfolio','pourquoi','contact'].forEach(function(id){ var s = document.getElementById(id); if(s) sio.observe(s); });
  }

  /* ---------- boucle de scroll (parallax, showreel, vision) ---------- */
  var parallaxEls = $$('[data-speed]');
  var stage = $('#showreelStage'), frame = $('#showreelFrame');
  var vq = $('#visionQuote'), vWords = [];
  if(vq){
    vq.innerHTML = vq.textContent.trim().split(/\s+/).map(function(w){ return '<span class="vw">' + w + '</span>'; }).join(' ');
    vWords = $$('.vw', vq);
  }
  var vision = $('#vision');
  var scrollTick = false;

  /* pellicule horizontale */
  var reel = $('#reel'), reelTrack = $('#reelTrack'), reelBar = $('#reelBar');
  var reelCards = $$('.reel__card'), reelX = 0, reelTarget = 0, reelOn = false, reelDist = 0;
  function sizeReel(){
    reelOn = !!reel && !reduce && window.innerWidth > 700;
    if(!reelOn){ if(reel) reel.style.height = ''; return; }
    reelDist = Math.max(0, reelTrack.scrollWidth - window.innerWidth);
    reel.style.height = (reelDist + window.innerHeight) + 'px';
  }
  sizeReel();
  window.addEventListener('load', sizeReel);

  function onScroll(){
    var y = window.scrollY, vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';

    nav.classList.toggle('is-scrolled', y > 40);
    if(!menuOpen) nav.classList.toggle('is-hidden', y > lastY && y > 500);
    lastY = y;

    if(!reduce){
      parallaxEls.forEach(function(el){
        var r = el.parentElement.getBoundingClientRect();
        if(r.bottom < 0 || r.top > vh) return;
        var center = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (center * -parseFloat(el.dataset.speed)) + 'px,0)' + (el.closest('.img-reveal.is-in') ? ' scale(1.06)' : '');
      });

      if(stage && frame && window.innerWidth > 700){
        var sr = stage.getBoundingClientRect();
        var p = clamp((vh - sr.top) / (vh * 1.1), 0, 1);
        frame.style.setProperty('--p', p.toFixed(3));
        frame.style.setProperty('--p-inv', (1 - p).toFixed(3));
      }
    }

    if(reelOn){
      var rr = reel.getBoundingClientRect();
      var rp = clamp(-rr.top / Math.max(1, rr.height - vh), 0, 1);
      reelTarget = -rp * reelDist;
      if(reelBar) reelBar.style.transform = 'scaleX(' + rp.toFixed(3) + ')';
    }

    if(vision && vWords.length){
      var vr = vision.getBoundingClientRect();
      var vp = reduce ? 1 : clamp((vh * 0.85 - vr.top) / (vr.height * 0.75), 0, 1);
      var lit = Math.round(vp * vWords.length);
      vWords.forEach(function(w, i){ w.classList.toggle('is-lit', i < lit); });
    }
    scrollTick = false;
  }
  window.addEventListener('scroll', function(){ if(!scrollTick){ scrollTick = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', function(){ sizeReel(); onScroll(); });
  onScroll();

  /* ---------- showreel : lecture auto muette quand visible ---------- */
  var video = $('#showreelVideo'), soundBtn = $('#showreelSound'), playBtn = $('#showreelPlay');
  if(video){
    var vFrame = $('#showreelFrame');
    var tryPlay = function(){ video.muted = video.muted; var pr = video.play(); if(pr && pr.catch) pr.catch(function(){ vFrame.classList.add('is-paused'); }); };
    video.addEventListener('play', function(){ vFrame.classList.remove('is-paused'); });
    video.addEventListener('pause', function(){ vFrame.classList.add('is-paused'); });
    video.addEventListener('error', function(){ vFrame.classList.add('is-paused'); }, true);
    // la vidéo n'est téléchargée qu'à l'approche de sa section
    var vLoaded = false;
    function loadVideo(){
      if(vLoaded) return; vLoaded = true;
      var src = video.querySelector('source[data-src]');
      if(src){ src.src = src.getAttribute('data-src'); src.removeAttribute('data-src'); }
      video.preload = 'auto'; video.load();
    }
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries, obs){
        entries.forEach(function(e){ if(e.isIntersecting){ loadVideo(); obs.disconnect(); } });
      }, { rootMargin: '600px 0px' }).observe(vFrame);
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){ if(e.isIntersecting){ loadVideo(); tryPlay(); } else video.pause(); });
      }, { threshold: .25 }).observe(vFrame);
    } else { loadVideo(); tryPlay(); }
    vFrame.addEventListener('click', function(e){
      if(soundBtn.contains(e.target)) return;
      if(video.paused) tryPlay(); else video.pause();
    });
    soundBtn.addEventListener('click', function(){
      video.muted = !video.muted;
      if(!video.muted && video.paused) tryPlay();
      soundBtn.setAttribute('aria-pressed', !video.muted);
      $('.showreel__sound-label', soundBtn).textContent = video.muted ? 'Activer le son' : 'Couper le son';
    });
  }

  /* ---------- curseur personnalisé ---------- */
  var cursor = $('#cursor');
  var mx = -100, my = -100, cx = -100, cy = -100;
  if(finePointer && !reduce){
    document.addEventListener('mousemove', function(e){ mx = e.clientX; my = e.clientY; cursor.classList.add('is-visible'); });
    document.addEventListener('mouseleave', function(){ cursor.classList.remove('is-visible'); });
    $$('a, button, select, input, textarea').forEach(function(el){
      el.addEventListener('mouseenter', function(){ cursor.classList.add(el.classList.contains('tile') ? 'is-view' : 'is-hover'); });
      el.addEventListener('mouseleave', function(){ cursor.classList.remove('is-hover', 'is-view'); });
    });
  }

  /* ---------- expertise : image qui suit la souris ---------- */
  var floatImg = $('#floatImg'), floatPic = floatImg ? $('img', floatImg) : null;
  var fx = 0, fy = 0, frot = 0;
  var services = $$('.service');
  if(finePointer && !reduce && floatImg){
    services.forEach(function(s){
      s.addEventListener('mouseenter', function(){
        if(floatPic.getAttribute('src') !== s.dataset.img) floatPic.src = s.dataset.img;
        floatImg.classList.add('is-on');
      });
      s.addEventListener('mouseleave', function(){ floatImg.classList.remove('is-on'); });
    });
  }

  /* ---------- boucle d'animation (curseur + image flottante) ---------- */
  var heroSlidesEl = $('#heroSlides'), heroContent = $('.hero__content'), hx = 0, hy = 0;
  function raf(){
    if(reelOn){
      reelX = lerp(reelX, reelTarget, .09);
      reelTrack.style.transform = 'translate3d(' + reelX.toFixed(2) + 'px,0,0)';
      var vw = window.innerWidth;
      reelCards.forEach(function(c){
        var r = c.getBoundingClientRect();
        if(r.right < -50 || r.left > vw + 50) return;
        var off = (r.left + r.width / 2 - vw / 2) / vw;
        c.style.setProperty('--px', (off * -40).toFixed(1) + 'px');
      });
    }
    if(!finePointer){ requestAnimationFrame(raf); return; }
    cx = lerp(cx, mx, .22); cy = lerp(cy, my, .22);
    cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
    if(window.scrollY < window.innerHeight && mx > 0){
      hx = lerp(hx, mx / window.innerWidth - .5, .05); hy = lerp(hy, my / window.innerHeight - .5, .05);
      heroSlidesEl.style.transform = 'translate3d(' + (-hx * 24).toFixed(2) + 'px,' + (-hy * 16).toFixed(2) + 'px,0) scale(1.03)';
      heroContent.style.transform = 'translate3d(' + (hx * 12).toFixed(2) + 'px,' + (hy * 8).toFixed(2) + 'px,0)';
    }
    if(floatImg){
      var nx = lerp(fx, mx, .12), ny = lerp(fy, my, .12);
      frot = lerp(frot, clamp((mx - fx) * .08, -10, 10), .1);
      fx = nx; fy = ny;
      floatImg.style.left = fx + 'px'; floatImg.style.top = fy + 'px';
      floatImg.style.setProperty('--rot', frot.toFixed(2) + 'deg');
    }
    requestAnimationFrame(raf);
  }
  if(!reduce) requestAnimationFrame(raf);

  /* ---------- boutons magnétiques ---------- */
  if(finePointer && !reduce){
    $$('.magnetic').forEach(function(el){
      var inner = el.querySelector('span');
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + dx * .22 + 'px,' + dy * .3 + 'px)';
        if(inner) inner.style.transform = 'translate(' + dx * .12 + 'px,' + dy * .16 + 'px)';
      });
      el.addEventListener('mouseleave', function(){
        el.style.transition = 'transform .7s cubic-bezier(.22,1,.36,1)';
        el.style.transform = ''; if(inner){ inner.style.transition = el.style.transition; inner.style.transform = ''; }
        setTimeout(function(){ el.style.transition = ''; if(inner) inner.style.transition = ''; }, 700);
      });
    });
  }

  /* ---------- portfolio : inclinaison 3D au survol ---------- */
  if(finePointer && !reduce){
    tiles.forEach(function(t){
      t.addEventListener('mousemove', function(e){
        var r = t.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        t.classList.add('is-tilting');
        t.style.transform = 'rotateY(' + (x * 7).toFixed(2) + 'deg) rotateX(' + (-y * 7).toFixed(2) + 'deg)';
      });
      t.addEventListener('mouseleave', function(){ t.classList.remove('is-tilting'); t.style.transform = ''; });
    });
  }

  /* ---------- portfolio : filtres animés (FLIP) ---------- */
  var filters = $$('.filter');
  filters.forEach(function(btn){
    btn.addEventListener('click', function(){
      var f = btn.dataset.filter;
      filters.forEach(function(b){ var on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });
      var before = new Map();
      tiles.forEach(function(t){ if(!t.classList.contains('is-hidden')) before.set(t, t.getBoundingClientRect()); });
      tiles.forEach(function(t){ t.classList.toggle('is-hidden', !(f === 'all' || t.dataset.cat === f)); });
      var k = 0;
      tiles.forEach(function(t){
        if(t.classList.contains('is-hidden')) return;
        t.classList.add('is-in'); t.style.setProperty('--d', '0s');
        if(reduce || !t.animate) return;
        var a = t.getBoundingClientRect(), b = before.get(t);
        if(b){
          var dx = b.left - a.left, dy = b.top - a.top, sx = b.width / a.width, sy = b.height / a.height;
          t.animate([{ transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')' }, { transformOrigin: '0 0', transform: 'none' }],
            { duration: 800, easing: 'cubic-bezier(.22,1,.36,1)' });
        } else {
          t.animate([{ opacity: 0, transform: 'translateY(40px) scale(.92)' }, { opacity: 1, transform: 'none' }],
            { duration: 800, delay: 60 * k++, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
        }
      });
    });
  });

  /* ---------- lightbox ---------- */
  var lb = $('#lightbox'), lbImg = $('#lbImg'), lbTitle = $('#lbTitle'), lbLabel = $('#lbLabel'), lbCount = $('#lbCount');
  var list = [], idx = 0, lastFocus = null;
  function visibleTiles(){ return tiles.filter(function(t){ return !t.classList.contains('is-hidden'); }); }
  function showLb(i){
    idx = (i + list.length) % list.length;
    var t = list[idx];
    lbImg.classList.remove('is-in');
    var pre = new Image();
    pre.onload = pre.onerror = function(){
      lbImg.src = t.getAttribute('href'); lbImg.alt = $('img', t).alt;
      lbTitle.textContent = t.dataset.title; lbLabel.textContent = t.dataset.label;
      lbCount.textContent = (idx + 1) + ' / ' + list.length;
      requestAnimationFrame(function(){ lbImg.classList.add('is-in'); });
    };
    pre.src = t.getAttribute('href');
  }
  function openLb(t){
    list = visibleTiles(); lastFocus = t;
    lb.classList.add('is-open'); lb.setAttribute('aria-hidden', 'false'); body.style.overflow = 'hidden';
    showLb(list.indexOf(t));
    $('#lbClose').focus();
  }
  function closeLb(){
    lb.classList.remove('is-open'); lb.setAttribute('aria-hidden', 'true'); body.style.overflow = '';
    if(lastFocus) lastFocus.focus();
  }
  tiles.forEach(function(t){ t.addEventListener('click', function(e){ e.preventDefault(); openLb(t); }); });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', function(){ showLb(idx - 1); });
  $('#lbNext').addEventListener('click', function(){ showLb(idx + 1); });
  lb.addEventListener('click', function(e){ if(e.target === lb) closeLb(); });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && menuOpen) setMenu(false);
    if(!lb.classList.contains('is-open')) return;
    if(e.key === 'Escape') closeLb();
    if(e.key === 'ArrowLeft') showLb(idx - 1);
    if(e.key === 'ArrowRight') showLb(idx + 1);
    if(e.key === 'Tab'){
      var f = $$('.lightbox__btn', lb), first = f[0], last = f[f.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });
  var touchX = null;
  lb.addEventListener('touchstart', function(e){ touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function(e){
    if(touchX === null) return;
    var dx = e.changedTouches[0].clientX - touchX;
    if(Math.abs(dx) > 50) showLb(idx + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- formulaire (mailto) ---------- */
  var form = $('#contactForm'), status = $('#formStatus');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var name = form.name.value.trim(), email = form.email.value.trim(), message = form.message.value.trim(), type = form.type.value;
    status.classList.remove('is-error');
    if(!name || !email || !message){
      status.classList.add('is-error');
      status.textContent = 'Renseignez votre nom, votre email et votre message pour envoyer.';
      return;
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      status.classList.add('is-error');
      status.textContent = 'L\'adresse email semble incomplète : vérifiez-la (ex. vous@exemple.com).';
      return;
    }
    var subject = encodeURIComponent(type + ' — message de ' + name + ' (site Royal Pictures)');
    var bodyTxt = encodeURIComponent('Type de projet : ' + type + '\n\n' + message + '\n\n— ' + name + ' (' + email + ')');
    window.location.href = 'mailto:contact@royalpictures.bf?subject=' + subject + '&body=' + bodyTxt;
    status.textContent = 'Merci ' + name + ', votre application mail va s\'ouvrir.';
  });
})();
