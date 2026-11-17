
  (function () {
    "use strict";
    document.documentElement.classList.add('js');
    // Preserve previously shared one-page section links.
    if (document.body.dataset.page === 'index.html') {
      var legacy = {about:'about.html',research:'research.html',projects:'research.html#projects',people:'people.html',pubs:'publications.html',contact:'contact.html','microbial-ecology':'research.html#microbial-ecology','project-neuro':'research.html#project-neuro','project-hematology':'research.html#project-hematology','project-immunity':'research.html#project-immunity','project-nutrition':'research.html#project-nutrition'};
      var oldHash = location.hash.slice(1);
      if (legacy[oldHash]) { location.replace(legacy[oldHash]); return; }
    }

    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var nav = document.getElementById("nav");
    function onScroll() { nav.classList.toggle("scrolled", window.scrollY > 8); }
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

    var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { threshold: 0.1, rootMargin: "0px 0px -6% 0px" });
      items.forEach(function (el) { io.observe(el); });
    }

    // Responsive site navigation.
    var menuButton = document.querySelector('.menu-toggle');
    var siteMenu = document.getElementById('site-menu');
    function closeMenu() {
      if (!menuButton || !siteMenu) return;
      menuButton.setAttribute('aria-expanded', 'false');
      siteMenu.classList.remove('is-open');
    }
    if (menuButton && siteMenu) {
      menuButton.addEventListener('click', function () {
        var open = menuButton.getAttribute('aria-expanded') !== 'true';
        menuButton.setAttribute('aria-expanded', String(open));
        siteMenu.classList.toggle('is-open', open);
      });
      siteMenu.addEventListener('click', function (event) { if (event.target.closest('a')) closeMenu(); });
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { closeMenu(); menuButton.focus(); }
      });
    }

    // Search the complete publication list; featured cards remain for browsing.
    var filterForm = document.getElementById('publication-filters');
    if (filterForm) {
      var search = document.getElementById('publication-query');
      var year = document.getElementById('publication-year');
      var reset = document.getElementById('publication-reset');
      var counter = document.getElementById('publication-count');
      var empty = document.getElementById('publication-empty');
      var featured = document.querySelector('[data-featured]');
      var papers = Array.prototype.slice.call(document.querySelectorAll('[data-publication]'));
      var groups = Array.prototype.slice.call(document.querySelectorAll('[data-year-group]'));
      function normalize(text) { return text.normalize('NFKC').toLocaleLowerCase(); }
      var textIndex = papers.map(function (p) { return normalize(p.textContent); });
      function filterPapers() {
        var terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
        var selectedYear = year.value;
        var count = 0;
        papers.forEach(function (paper, i) {
          var match = (!selectedYear || paper.dataset.year === selectedYear) && terms.every(function (term) { return textIndex[i].indexOf(term) !== -1; });
          paper.hidden = !match;
          if (match) count++;
        });
        groups.forEach(function (group) { group.hidden = !group.querySelector('[data-publication]:not([hidden])'); });
        if (featured) featured.hidden = !!(terms.length || selectedYear);
        counter.textContent = count + ' of ' + papers.length + ' papers';
        empty.hidden = count !== 0;
      }
      search.addEventListener('input', filterPapers);
      year.addEventListener('change', filterPapers);
      filterForm.addEventListener('submit', function (event) { event.preventDefault(); });
      reset.addEventListener('click', function () { search.value = ''; year.value = ''; filterPapers(); search.focus(); });
      filterPapers();
    }

    // ambient culture-plate canvas
    var canvas = document.getElementById("plate");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, colonies = [];

    function accentRGB() {
      var probe = document.createElement("span");
      probe.style.color = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#0047BB";
      document.body.appendChild(probe);
      var c = getComputedStyle(probe).color;
      document.body.removeChild(probe);
      var m = c.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
      return m ? [ +m[1], +m[2], +m[3] ] : [0, 71, 187];
    }
    var rgb = accentRGB();
    function sr(i) { return (Math.sin(i * 12.9898) * 43758.5453) % 1; }

    function build() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      colonies = [];
      var n = Math.max(8, Math.round(W / 130));
      for (var i = 0; i < n; i++) {
        colonies.push({
          x: Math.abs(sr(i + 1)) * W, y: Math.abs(sr(i + 7.3)) * H,
          r: 26 + Math.abs(sr(i + 3.1)) * 74, a: 0.045 + Math.abs(sr(i + 5.5)) * 0.075,
          ph: i * 1.7, sp: 0.35 + Math.abs(sr(i + 2.2)) * 0.5,
          dx: sr(i + 9.1) * 0.16, dy: sr(i + 4.4) * 0.14
        });
      }
    }
    function draw(t) {
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < colonies.length; i++) {
        var c = colonies[i];
        var x = c.x + Math.sin(t * 0.0002 * c.sp + c.ph) * 15 + c.dx * t * 0.004;
        var y = c.y + Math.cos(t * 0.00018 * c.sp + c.ph) * 13 + c.dy * t * 0.004;
        x = ((x % (W + 200)) + (W + 200)) % (W + 200) - 100;
        y = ((y % (H + 200)) + (H + 200)) % (H + 200) - 100;
        var r = c.r * (1 + Math.sin(t * 0.0006 * c.sp + c.ph) * 0.06);
        var g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + c.a + ")");
        g.addColorStop(0.62, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (c.a * 0.34) + ")");
        g.addColorStop(1, "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ",0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + (c.a * 0.5) + ")";
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, Math.PI * 2); ctx.stroke();
      }
    }
    var raf = null, start = 0;
    function loop(ts) { if (!start) start = ts; draw(ts - start); raf = requestAnimationFrame(loop); }
    function init() { build(); if (reduce) { draw(3000); } else { if (raf) cancelAnimationFrame(raf); start = 0; raf = requestAnimationFrame(loop); } }
    init();

    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { rgb = accentRGB(); init(); }, 180); });
    var mq = window.matchMedia("(prefers-color-scheme: dark)");
    if (mq.addEventListener) mq.addEventListener("change", function () { setTimeout(function(){ rgb = accentRGB(); }, 40); });
    new MutationObserver(function () { rgb = accentRGB(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  })();

// Small decorative microbes, using the available space on each screen.
(function () {
  'use strict';
  var preference=window.matchMedia('(prefers-reduced-motion: reduce)');
  var paused=false;
  try{paused=localStorage.getItem('mblab-motion')==='off';}catch(_){}
  var layer=document.createElement('div');layer.className='microbe-drift-layer';layer.setAttribute('aria-hidden','true');document.body.appendChild(layer);
  var toggle=document.createElement('button');toggle.type='button';toggle.className='microbe-motion-toggle';document.body.appendChild(toggle);
  var stopped=true,sprites=[],size=28;
  var paths=['assets/mascots/microbe-teal.webp','assets/mascots/microbe-orange.webp'];

  function mobileLanes(){
    var width=window.innerWidth,height=window.innerHeight,inset=14,rects=[];
    var nav=document.querySelector('#nav');
    var top=Math.max(126,nav?nav.getBoundingClientRect().bottom+16:126);
    document.querySelectorAll('h1,h2,h3,h4,p,label,dt,dd,.name,.role,.pub-title,.pub-meta,.sel-auth,.cv-body,.cv-yr,a:not(.study-link),button,input,select,img').forEach(function(el){
      if(el.closest('.microbe-drift-layer'))return;
      var box=el.getBoundingClientRect();
      if(!box.width||!box.height||box.bottom<top||box.top>height||getComputedStyle(el).visibility==='hidden')return;
      var boxes;
      if(el.matches('button,input,select,img'))boxes=[box];
      else{var range=document.createRange();range.selectNodeContents(el);boxes=Array.from(range.getClientRects());}
      boxes.forEach(function(r){if(r.width&&r.height)rects.push({left:r.left-8,right:r.right+8,top:r.top-8,bottom:r.bottom+8});});
    });
    var candidates=[];
    function add(left,right,y){if(right-left>=80)candidates.push({left:left,right:right,y:y,width:right-left});}
    for(var y=top;y<=height-size-20;y+=12){
      var spans=rects.filter(function(r){return r.bottom>y-5&&r.top<y+size+5;}).sort(function(a,b){return a.left-b.left;});
      var cursor=inset;
      spans.forEach(function(r){
        if(r.right<=cursor)return;
        add(cursor,Math.min(width-inset-size,r.left-size),y);
        cursor=Math.max(cursor,r.right);
      });
      add(cursor,width-inset-size,y);
    }
    // Prefer wide spaces and separate vertical levels, rather than edge lanes.
    candidates.forEach(function(l){l.score=l.width+Math.random()*24;});
    candidates.sort(function(a,b){return b.score-a.score;});
    var chosen=[];
    candidates.forEach(function(l){if(chosen.length<2&&chosen.every(function(x){return Math.abs(x.y-l.y)>72;}))chosen.push(l);});
    return chosen;
  }
  function desktopPoint(i){
    var w=window.innerWidth,h=window.innerHeight,gutter=Math.max(16,Math.min(80,(w-1168)/2-28));
    return {x:i%2?w-28-Math.random()*gutter:Math.random()*gutter,y:140+Math.random()*Math.max(30,h-225)};
  }
  function lanePoint(lane,from){
    var fraction=from?(from.x<(lane.left+lane.right)/2?0.65+Math.random()*0.3:0.05+Math.random()*0.3):0.35+Math.random()*0.3;
    return {x:lane.left+fraction*lane.width,y:lane.y};
  }
  function move(sprite,i){
    if(stopped)return;
    var next=sprite.lane?lanePoint(sprite.lane,sprite.point):desktopPoint(i);
    var animation=sprite.element.animate([
      {transform:'translate3d('+sprite.point.x+'px,'+sprite.point.y+'px,0)'},
      {transform:'translate3d('+next.x+'px,'+next.y+'px,0)'}
    ],{duration:sprite.lane?14000+Math.random()*10000:18000+Math.random()*18000,easing:'ease-in-out',fill:'forwards'});
    sprite.animation=animation;
    animation.finished.then(function(){sprite.point=next;move(sprite,i);}).catch(function(){});
  }
  function sync(){
    stopped=paused||preference.matches||document.hidden;
    sprites.forEach(function(s){if(s.animation)s.animation.cancel();});layer.replaceChildren();sprites=[];
    document.body.classList.toggle('microbe-motion-ready',!stopped);
    toggle.hidden=preference.matches;toggle.textContent=paused?'▶':'Ⅱ';
    toggle.setAttribute('aria-label',paused?'미생물 캐릭터 움직임 재생':'미생물 캐릭터 움직임 일시정지');toggle.title=toggle.getAttribute('aria-label');toggle.setAttribute('aria-pressed',String(!paused));
    if(stopped)return;
    var small=window.innerWidth<720;size=small?24:28;
    var lanes=small?mobileLanes():[];
    if(small&&!lanes.length){document.body.classList.remove('microbe-motion-ready');return;}
    var count=small?lanes.length:3;
    for(var i=0;i<count;i++){
      var element=document.createElement('span');element.className='microbe-drifter';element.style.width=size+'px';element.style.height=size+'px';
      var img=document.createElement('img');img.src=paths[i%paths.length];img.alt='';img.width=size;img.height=size;img.style.animationDelay=(-i*1.7)+'s';element.appendChild(img);layer.appendChild(element);
      var lane=small?lanes[i]:null;
      var sprite={element:element,lane:lane,point:lane?lanePoint(lane):desktopPoint(i)};sprites.push(sprite);move(sprite,i);
    }
  }
  toggle.addEventListener('click',function(){paused=!paused;try{localStorage.setItem('mblab-motion',paused?'off':'on');}catch(_){}sync();});
  preference.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
  var resizeTimer,scrollTimer;
  window.addEventListener('resize',function(){clearTimeout(resizeTimer);resizeTimer=setTimeout(sync,180);});
  window.addEventListener('scroll',function(){
    if(window.innerWidth>=720||stopped)return;
    layer.style.opacity='0';clearTimeout(scrollTimer);
    scrollTimer=setTimeout(function(){layer.style.opacity='';sync();},180);
  },{passive:true});
  var menu=document.querySelector('.menu-toggle');
  if(menu)menu.addEventListener('click',function(){if(window.innerWidth<720)setTimeout(sync,0);});
  sync();if(document.fonts)document.fonts.ready.then(sync);
})();
