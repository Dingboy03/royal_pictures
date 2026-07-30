(function(){
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- year ---------- */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- nav scroll state ---------- */
  var nav = document.getElementById('nav');
  function onScroll(){
    if(window.scrollY > 40){ nav.classList.add('is-scrolled'); }
    else{ nav.classList.remove('is-scrolled'); }
  }
  document.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var toggle = document.getElementById('navToggle');
  var mobile = document.getElementById('navMobile');
  toggle.addEventListener('click', function(){
    var open = mobile.classList.toggle('is-open');
    toggle.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  mobile.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click', function(){
      mobile.classList.remove('is-open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', false);
      document.body.style.overflow = '';
    });
  });

  /* ---------- reveal on scroll ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if('IntersectionObserver' in window && !reduceMotion){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(function(el){ io.observe(el); });
  } else {
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  }

  /* ---------- parallax (hero + vision) ---------- */
  var heroBg = document.getElementById('heroBg');
  var visionBg = document.getElementById('visionBg');
  var ticking = false;
  function parallax(){
    var y = window.scrollY;
    if(heroBg){
      var heroRect = heroBg.parentElement.getBoundingClientRect();
      if(heroRect.bottom > 0 && heroRect.top < window.innerHeight){
        heroBg.style.transform = 'translateY(' + (y * 0.18) + 'px)';
      }
    }
    if(visionBg){
      var vRect = visionBg.parentElement.getBoundingClientRect();
      if(vRect.bottom > 0 && vRect.top < window.innerHeight){
        var progress = (window.innerHeight - vRect.top) * 0.08;
        visionBg.style.transform = 'translateY(' + progress + 'px)';
      }
    }
    ticking = false;
  }
  function requestTick(){
    if(!ticking && !reduceMotion){
      window.requestAnimationFrame(parallax);
      ticking = true;
    }
  }
  document.addEventListener('scroll', requestTick, { passive: true });
  parallax();

  /* ---------- lightbox ---------- */
  var items = Array.prototype.slice.call(document.querySelectorAll('.gallery__item'));
  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  var current = 0;

  function openLightbox(index){
    current = index;
    updateLightboxImg();
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox(){
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function updateLightboxImg(){
    var el = items[current];
    lbImg.src = el.getAttribute('data-full');
    lbImg.alt = el.getAttribute('data-title') || '';
  }
  items.forEach(function(el, i){
    el.addEventListener('click', function(){ openLightbox(i); });
  });
  lbClose.addEventListener('click', closeLightbox);
  lbPrev.addEventListener('click', function(){ current = (current - 1 + items.length) % items.length; updateLightboxImg(); });
  lbNext.addEventListener('click', function(){ current = (current + 1) % items.length; updateLightboxImg(); });
  lightbox.addEventListener('click', function(e){ if(e.target === lightbox){ closeLightbox(); } });
  document.addEventListener('keydown', function(e){
    if(!lightbox.classList.contains('is-open')) return;
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowLeft') lbPrev.click();
    if(e.key === 'ArrowRight') lbNext.click();
  });

  /* ---------- contact form (mailto) ---------- */
  var form = document.getElementById('contactForm');
  var status = document.getElementById('formStatus');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var message = form.message.value.trim();
    var subject = encodeURIComponent('Nouveau message de ' + name + ' — Site Royal Pictures');
    var body = encodeURIComponent(message + '\n\n— ' + name + ' (' + email + ')');
    window.location.href = 'mailto:contact@royalpictures.bf?subject=' + subject + '&body=' + body;
    status.textContent = 'Merci ' + name + ' — votre application mail va s\'ouvrir.';
  });
/* ---------- showreel : lecture auto au scroll (muet), pause hors champ ---------- */
  var showreelVideo = document.getElementById('showreelVideo');
  if(showreelVideo && 'IntersectionObserver' in window){
    var vObserver = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          showreelVideo.play().catch(function(){});
        } else {
          showreelVideo.pause();
        }
      });
    }, { threshold: 0.5 });
    vObserver.observe(showreelVideo);
  }

})();
