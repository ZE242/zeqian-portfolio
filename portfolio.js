'use strict';

function setupShowcase() {
  const runway=document.querySelector('.hero-runway');
  const stage=runway.querySelector('.world-stage');
  const aperture=stage.querySelector('.world-aperture');
  const plates=Array.from(stage.querySelectorAll('.world-plate'));
  const foregrounds=[];
  const layers=plates.map(plate=>{
    const layer=document.createElement('div');
    layer.className='world-layer';
    const foreground=plate.cloneNode(false);
    foreground.alt='';
    foreground.className='world-foreground';
    foreground.setAttribute('aria-hidden','true');
    plate.replaceWith(layer);
    layer.append(plate);
    foregrounds.push(foreground);
    return layer;
  });
  stage.querySelector('.world-plates').append(...foregrounds);
  const rail=stage.querySelector('.world-nav');
  const tabs=Array.from(rail.querySelectorAll('button'));
  const caption=stage.querySelector('.caption-block');
  const name=stage.querySelector('.world-name span');
  const emphasis=stage.querySelector('.world-name em');
  const series=stage.querySelector('.world-series');
  const link=stage.querySelector('.world-link');
  const position=stage.querySelector('.position');
  const status=stage.querySelector('.world-status');
  const header=document.querySelector('.masthead');
  const navigation=Array.from(header.querySelectorAll('.topnav a[href^="#"]'));
  const concepts=document.querySelector('#concept-design');
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const compact=matchMedia('(max-width:650px)');
  const last=plates.length-1;
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  let current=-1,top=0,step=1,width=1,frame=0,drag=null,renderer=null;
  let x=0,y=0,aimX=0,aimY=0;
  const holdMs=4500, transitionMs=6000;
  let ambientScene=-1;
  const portals=[[64,34,28,100],[50,43,27,46],[52,36,46,24],[50,48,48,36],[50,40,30,46]];
  const exits=[[-68,-16,1.3],[0,0,2.7],[0,-48,1.4],[0,-10,1.8],[0,16,1.8]];
  const smooth=(low,high,value)=>{
    const v=clamp((value-low)/(high-low),0,1);
    return v*v*(3-2*v);
  };
  const wrap=value=>((value%plates.length)+plates.length)%plates.length;
  let view=0,scrollPosition=0,holdTimer=0,passage=null;
  let linkHovered=false,linkFocused=false;

  function cancelHold() {
    clearTimeout(holdTimer);
    holdTimer=0;
    passage=null;
  }
  function canAdvance() {
    return !document.hidden && !drag && !linkHovered && !linkFocused &&
      window.scrollY<=top+step*last;
  }
  function armHold() {
    if (holdTimer || passage || !canAdvance()) return;
    const image=plates[Math.round(view)%plates.length];
    if (!image.complete || !image.naturalWidth) return;
    holdTimer=setTimeout(()=>{
      holdTimer=0;
      if (!canAdvance()) return;
      const target=Math.floor(view)+1;
      const next=plates[target%plates.length];
      if (next.complete && next.naturalWidth) {
        passage={start:performance.now(),from:view,to:target,duration:transitionMs*(target-view)};
      }
      schedule();
    },holdMs);
  }
  function seek(value) {
    cancelHold();
    view=wrap(value);
    schedule();
  }
  function schedule() {
    if (!frame) frame=requestAnimationFrame(render);
  }
  function select(index) {
    const scene=plates[index].dataset;
    current=index;
    name.textContent=scene.name;
    emphasis.textContent=scene.em;
    series.textContent=scene.series;
    position.textContent=String(index+1).padStart(2,'0')+' / 05';
    link.href=scene.href;
    link.setAttribute('aria-label','查看作品：'+scene.title);
    status.textContent=(index+1)+' / 5，'+scene.title+'，'+scene.series;
    tabs.forEach((tab,i)=>{
      if(i===index) tab.setAttribute('aria-current','true');
      else tab.removeAttribute('aria-current');
      plates[i].setAttribute('aria-hidden',String(i!==index));
    });
  }
  function render(now) {
    frame=0;
    if (passage) {
      const fraction=clamp((now-passage.start)/passage.duration,0,1);
      const eased=fraction*fraction*(3-2*fraction);
      view=wrap(passage.from+(passage.to-passage.from)*eased);
      if (fraction===1) {
        view=wrap(passage.to);
        passage=null;
      }
    }
    const index=Math.round(view)%plates.length;
    if(current!==index) select(index);
    const inPage=window.scrollY>top+step*last+stage.offsetHeight*.45;
    header.classList.toggle('in-page',inPage);
    const location=inPage ? (concepts.getBoundingClientRect().top<=130?'#concept-design':'#projects') : '#main';
    navigation.forEach(a=>{
      if(a.hash===location) a.setAttribute('aria-current','location');
      else a.removeAttribute('aria-current');
    });
    if (window.scrollY>top+runway.offsetHeight) return;
    x+=(aimX-x)*.22; y+=(aimY-y)*.22;
    const from=Math.floor(view),to=(from+1)%plates.length,t=view-from;
    const titleFade=!linkHovered && !linkFocused ? clamp(Math.abs(t-.5)/.18,0,1) : 1;
    caption.style.opacity=String(titleFade*titleFade*(3-2*titleFade));
    {
      if (ambientScene!==from) {
        stage.style.setProperty('--ambience','url("'+plates[from].getAttribute('src')+'")');
        stage.style.setProperty('--next-ambience','url("'+plates[to].getAttribute('src')+'")');
        ambientScene=from;
      }
      stage.style.setProperty('--dissolve',String(t));
    }
    const hasGPU=!compact.matches && !motion.matches && renderer && renderer.draw(from,to,t,x,y);
    stage.classList.toggle('rendered',Boolean(hasGPU));
    for(let i=0;i<=last;i++) {
      tabs[i].style.setProperty('--filled',i<index?'1':i===index?String(.45+.55*clamp(view-index,0,1)):'0');
      if (hasGPU) continue;
      const el=layers[i];
      const incoming=i===to;
      const visible=i===from || (incoming && t>0);
      el.style.opacity=String(visible ? (motion.matches && incoming ? t : 1) : 0);
      el.style.zIndex=incoming?'1':'0';
      const foreground=foregrounds[i];
      foreground.style.opacity=String(i===from && !motion.matches ? 1-smooth(.76,.98,t) : 0);
      if (!visible) continue;
      const [cx,cy,rx,ry]=portals[from];
      const edge=420*smooth(.08,.96,t)-35;
      el.style.maskImage=incoming && !motion.matches && t<.98
        ? `radial-gradient(ellipse ${rx}% ${ry}% at ${cx}% ${cy}%,black ${edge}%,transparent ${edge+65}%)`
        : 'none';
      el.style.transformOrigin=`${portals[i][0]}% ${portals[i][1]}%`;
      const zoom=incoming ? .11*(1-t) : .34*t*t;
      el.style.transform=motion.matches?'none':`translate(${-x*.85}%,${y*.6}%) scale(${1.025+zoom})`;
      foreground.style.transformOrigin=el.style.transformOrigin;
      const [exitX,exitY,growth]=exits[from];
      foreground.style.transform=`translate(${-x*1.2+exitX*t*t}%,${y*.9+exitY*t*t}%) scale(${1.025+growth*t*t})`;

    }
    if (passage || Math.abs(aimX-x)+Math.abs(aimY-y)>.002) schedule();
    armHold();
  }
  function measure() {
    width=aperture.clientWidth;
    step=Math.max(340,Math.min(stage.clientHeight*.95,width*1.4,900));
    top=runway.getBoundingClientRect().top+window.scrollY;
    runway.style.height=(stage.offsetHeight+last*step)+'px';
    scrollPosition=clamp((window.scrollY-top)/step,0,last);
    renderer?.resize(width,aperture.clientHeight,compact.matches);
    schedule();
  }
  function syncScroll() {
    const next=clamp((window.scrollY-top)/step,0,last);
    const delta=next-scrollPosition;
    scrollPosition=next;
    if (delta) seek(view+delta);
    if (!canAdvance()) cancelHold();
    schedule();
  }
  function resetDwell() {
    cancelHold();
    schedule();
  }
  link.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){linkHovered=true;resetDwell();}});
  link.addEventListener('pointerleave',()=>{linkHovered=false;schedule();});
  link.addEventListener('focus',()=>{linkFocused=true;resetDwell();});
  link.addEventListener('blur',()=>{linkFocused=false;schedule();});
  document.addEventListener('visibilitychange',resetDwell);
  function resetPointer() {
    aimX=0;aimY=0;schedule();
  }
  tabs.forEach((button,i)=>button.addEventListener('click',()=>seek(i)));
  rail.hidden=false;
  aperture.addEventListener('pointerdown',e=>{
    if(e.isPrimary && e.button===0) {
      cancelHold();
      drag={id:e.pointerId,x:e.clientX,y:e.clientY,origin:view,active:false};
    }
  });
  aperture.addEventListener('pointermove',e=>{
    if(drag && drag.id===e.pointerId) {
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(!drag.active && Math.max(Math.abs(dx),Math.abs(dy))>6) {
        if(Math.abs(dx)<=Math.abs(dy)) {drag=null;schedule();return;}
        drag.active=true;aperture.setPointerCapture(e.pointerId);aperture.classList.add('dragging');
      }
      if(drag.active) seek(drag.origin-dx/width);
    }
    if(e.pointerType==='mouse'&&!motion.matches) {
      const box=aperture.getBoundingClientRect();
      aimX=clamp(2*(e.clientX-box.left)/box.width-1,-1,1);
      aimY=clamp(1-2*(e.clientY-box.top)/box.height,-1,1);
      schedule();
    }
  });
  function release(e) {
    if(!drag || drag.id!==e.pointerId) return;
    const released=drag;drag=null;
    aperture.classList.remove('dragging');
    if(aperture.hasPointerCapture(e.pointerId)) aperture.releasePointerCapture(e.pointerId);
    if(!released.active || e.type!=='pointerup') {schedule();return;}
    const delta=released.x-e.clientX,start=Math.round(released.origin);
    let goal=Math.round(released.origin+delta/width);
    if(goal===start && Math.abs(delta)>Math.min(width*.14,90)) goal+=Math.sign(delta);
    seek(goal);
  }
  for(const type of ['pointerup','pointercancel','lostpointercapture']) aperture.addEventListener(type,release);
  aperture.addEventListener('pointerleave',()=>{if(drag&&!drag.active)drag=null;resetPointer();});
  stage.addEventListener('wheel',e=>{
    if(e.ctrlKey || Math.abs(e.deltaX)<=Math.abs(e.deltaY)) return;
    const scale=e.deltaMode===1?16:e.deltaMode===2?width:1;
    const distance=e.deltaX*scale/width*step;
    if(window.scrollY<=top && distance<0) return;
    e.preventDefault();
    window.scrollBy({top:distance,behavior:'instant'});
  },{passive:false});
  window.addEventListener('keydown',e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||window.scrollY>top+last*step+1) return;
    if(e.key!=='ArrowRight'&&e.key!=='ArrowLeft')return;
    e.preventDefault();seek(current+(e.key==='ArrowRight'?1:-1));
  });
  motion.addEventListener('change',()=>{x=y=aimX=aimY=0;schedule();});
  window.addEventListener('scroll',syncScroll,{passive:true});
  window.addEventListener('resize',measure);
  window.addEventListener('pageshow',measure);
  plates.forEach(img=>img.addEventListener('load',schedule));
  try {renderer=createWorldRenderer(stage.querySelector('canvas'),plates,schedule);} catch {renderer=null;}
  measure();
  view=scrollPosition;
}
setupShowcase();

function setupViewer() {
  const viewer = document.querySelector('.viewer');
  if (typeof viewer.showModal !== 'function') return;
  const image = viewer.querySelector('.viewer-image');
  const caption = viewer.querySelector('.viewer-caption');
  const original = viewer.querySelector('.viewer-original');
  const count = viewer.querySelector('.viewer-count');
  const previous = viewer.querySelector('.viewer-prev');
  const next = viewer.querySelector('.viewer-next');
  let group = [], active = 0;
  function show(index) {
    active = index;
    const link = group[index];
    const thumbnail = link.querySelector('img');
    image.src = original.href = link.href;
    image.alt = thumbnail.alt;
    caption.textContent = link.closest('figure').querySelector('figcaption').textContent;
    count.textContent = (index + 1) + ' / ' + group.length;
    previous.disabled = index === 0;
    next.disabled = index === group.length - 1;
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a.image-link');
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const section = link.closest('.film-media, .spiaggia-assets, .concept-series, section');
    group = Array.from(section.querySelectorAll('a.image-link'));
    show(group.indexOf(link));
    viewer.showModal();
    document.documentElement.style.overflow = 'hidden';
  });
  previous.addEventListener('click',() => {if (active > 0) show(active - 1);});
  next.addEventListener('click',() => {if (active < group.length - 1) show(active + 1);});
  viewer.querySelector('.viewer-close').addEventListener('click',() => viewer.close());
  viewer.addEventListener('close',() => {document.documentElement.style.overflow = '';});
  viewer.addEventListener('keydown',event => {
    if (event.key === 'ArrowLeft' && active > 0) {event.preventDefault();show(active - 1);}
    if (event.key === 'ArrowRight' && active < group.length - 1) {event.preventDefault();show(active + 1);}
  });
}

setupViewer();

function setupScrollReveals() {
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window)) return;

  const targets=Array.from(document.querySelectorAll([
    'main > section :is(h2,h3,p,figure)',
    'main > section .index-links > a',
    'main > section .concept-jumps > a',
    'main > section .process > div',
    'main > section .sigurd-lead > .primary',
    'footer .bar > *'
  ].join(',')));

  function reveal(target) {
    target.classList.add('is-visible');
    observer.unobserve(target);
  }
  const observer=new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if (entry.isIntersecting) reveal(entry.target);
    });
  },{rootMargin:'0px 0px -5% 0px',threshold:.06});

  targets.forEach(target=>{
    if (target.getBoundingClientRect().bottom<=0) return;
    const siblings=Array.from(target.parentElement.children);
    target.style.setProperty('--reveal-delay',Math.min(siblings.indexOf(target),2)*90+'ms');
    target.classList.add('scroll-reveal');
    observer.observe(target);
  });
  document.addEventListener('focusin',event=>{
    const target=event.target.closest('.scroll-reveal');
    if (target) reveal(target);
  });
  motion.addEventListener('change',()=>{
    if (!motion.matches) return;
    targets.forEach(reveal);
    observer.disconnect();
  });
}

setupScrollReveals();
