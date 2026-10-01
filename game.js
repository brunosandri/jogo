(() => {
  'use strict';
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = {hud:$('hud'),start:$('start-screen'),pause:$('pause-screen'),over:$('gameover-screen'),score:$('score'),lives:$('lives'),mission:$('mission-text'),progress:$('mission-progress'),powerups:$('powerups'),toast:$('toast')};
  const W=430,H=820, lanes=[-1,0,1];
  let state='menu', last=0, audio=null, pointer=null, raf=0;
  let game;
  const colors=['#ff496f','#ffd23f','#50d9d2','#7b5cf2','#54c26e'];
  function reset(){game={time:0,score:0,bricks:0,lives:3,lane:0,x:0,targetX:0,jump:0,jumpV:0,duck:0,speed:.48,spawn:0,items:[],particles:[],shake:0,flash:0,inv:0,magnet:0,shield:0,missionGoal:12,missionDone:0,event:0,eventName:'',bg:0}; updateUI()}
  function resize(){const d=Math.min(devicePixelRatio||1,2); canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0)}
  window.addEventListener('resize',resize); resize(); reset();
  function sound(type){try{audio ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);const t=audio.currentTime;let f=type==='coin'?700:type==='hit'?100:type==='power'?420:240;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(type==='coin'?1100:type==='hit'?55:700,t+.12);g.gain.setValueAtTime(.08,t);g.gain.exponentialRampToValueAtTime(.001,t+.18);o.type=type==='hit'?'sawtooth':'sine';o.start();o.stop(t+.19)}catch(e){}}
  function start(){reset();state='play';ui.start.classList.add('hidden');ui.over.classList.add('hidden');ui.pause.classList.add('hidden');ui.hud.classList.remove('hidden');last=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);sound('start')}
  function home(){state='menu';ui.hud.classList.add('hidden');ui.pause.classList.add('hidden');ui.over.classList.add('hidden');ui.start.classList.remove('hidden');reset();draw()}
  function pause(){if(state!=='play')return;state='pause';ui.pause.classList.remove('hidden')}
  function resume(){if(state!=='pause')return;state='play';ui.pause.classList.add('hidden');last=performance.now();raf=requestAnimationFrame(loop)}
  $('play-btn').onclick=start;$('retry-btn').onclick=start;$('pause-btn').onclick=pause;$('resume-btn').onclick=resume;$('quit-btn').onclick=home;$('home-btn').onclick=home;
  function action(a){if(state!=='play')return;if(a==='left'&&game.lane>-1){game.lane--;sound('move')}if(a==='right'&&game.lane<1){game.lane++;sound('move')}if(a==='up'&&game.jump===0){game.jumpV=660;sound('move')}if(a==='down'){game.duck=.65;sound('move')}}
  addEventListener('keydown',e=>{const m={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',' ':'up',ArrowDown:'down',s:'down',S:'down'};if(m[e.key]){e.preventDefault();action(m[e.key])}if(e.key==='Escape')(state==='play'?pause:resume)()});
  canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
  canvas.addEventListener('pointerup',e=>{if(!pointer)return;let dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.max(Math.abs(dx),Math.abs(dy))>22)action(Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));pointer=null});
  function spawn(){let r=Math.random(),type=r<.38?'brick':r<.69?'low':r<.84?'high':r<.94?'power':'enemy';let lane=lanes[Math.floor(Math.random()*3)]; if(type==='power')game.items.push({type,lane,z:1.1,power:['magnet','shield','boost'][Math.floor(Math.random()*3)]}); else game.items.push({type,lane,z:1.1,kind:type==='enemy'?(Math.random()<.5?'henrique':'rafaela'):''}); if(type!=='brick'&&Math.random()<.68){let safe=lanes.filter(x=>x!==lane),bonus=safe[Math.floor(Math.random()*safe.length)];game.items.push({type:'brick',lane:bonus,z:1.14})}}
  function update(dt){game.time+=dt;game.bg=(game.bg+dt*game.speed)%1;game.speed=Math.min(.9,.48+game.time*.004);game.score+=dt*18*(1+game.speed);game.spawn-=dt;game.inv=Math.max(0,game.inv-dt);game.magnet=Math.max(0,game.magnet-dt);game.shield=Math.max(0,game.shield-dt);game.duck=Math.max(0,game.duck-dt);game.shake=Math.max(0,game.shake-dt);game.flash=Math.max(0,game.flash-dt);
    if(game.jumpV||game.jump>0){game.jump+=game.jumpV*dt;game.jumpV-=1450*dt;if(game.jump<=0){game.jump=0;game.jumpV=0}}
    game.targetX=game.lane*104;game.x+=(game.targetX-game.x)*Math.min(1,dt*12);
    if(game.spawn<=0){spawn();game.spawn=Math.max(.42,1.02-game.speed*.45)+Math.random()*.28}
    for(const it of game.items){it.z-=dt*game.speed;if(it.type==='brick'&&game.magnet&&it.z<.48)it.lane+=(game.lane-it.lane)*dt*8;if(!it.done&&it.z<.16&&it.z>-.04&&Math.abs(it.lane-game.x/104)<.42){if(it.type==='brick')collect(it);else if(it.type==='power')power(it);else {let safe=(it.type==='low'&&game.jump>58)||(it.type==='high'&&game.duck>0);if(!safe)hit(it)}}}
    game.items=game.items.filter(i=>i.z>-.15&&!i.done);for(const p of game.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=180*dt;p.life-=dt}game.particles=game.particles.filter(p=>p.life>0);updateUI()}
  function collect(it){it.done=true;game.bricks++;game.missionDone++;game.score+=100;sound('coin');burst(screenX(it.lane,it.z),screenY(it.z),'#ffd743');if(game.missionDone>=game.missionGoal){game.score+=1000;game.missionDone=0;game.missionGoal+=6;toast('MISSÃO COMPLETA! +1000');sound('power')}}
  function power(it){it.done=true;let n=it.power==='magnet'?'ÍMÃ DE PEÇAS':it.power==='shield'?'ESCUDO DE BLOCOS':'SUPER CORRIDA';if(it.power==='magnet')game.magnet=8;if(it.power==='shield')game.shield=10;if(it.power==='boost'){game.score+=750;game.flash=.35}toast(n);sound('power');burst(screenX(it.lane,it.z),screenY(it.z),'#54e2db')}
  function hit(it){it.done=true;if(game.inv)return;if(game.shield){game.shield=0;toast('ESCUDO SALVOU!');sound('power');return}game.lives--;game.inv=1.7;game.shake=.45;game.flash=.3;sound('hit');toast(it.kind==='henrique'?'HENRIQUE FEZ BAGUNÇA!':it.kind==='rafaela'?'RAFAELA MUDOU TUDO!':'CUIDADO!');if(game.lives<=0)setTimeout(end,450)}
  function end(){if(state!=='play')return;state='over';let s=Math.floor(game.score),best=Math.max(s,+localStorage.getItem('corraBenicioBest')||0);localStorage.setItem('corraBenicioBest',best);$('final-score').textContent=s.toLocaleString('pt-BR');$('final-bricks').textContent=game.bricks;$('best-score').textContent=best.toLocaleString('pt-BR');ui.over.classList.remove('hidden')}
  function toast(t){ui.toast.textContent=t;ui.toast.classList.add('show');clearTimeout(ui.toast.t);ui.toast.t=setTimeout(()=>ui.toast.classList.remove('show'),1200)}
  function updateUI(){ui.score.textContent=String(Math.floor(game.score)).padStart(5,'0');ui.lives.textContent=game.lives;ui.mission.textContent=`Colete ${game.missionGoal} peças`;ui.progress.textContent=`${game.missionDone}/${game.missionGoal}`;ui.powerups.innerHTML=(game.magnet?`<div class="power-pill">🧲 ${Math.ceil(game.magnet)}s</div>`:'')+(game.shield?`<div class="power-pill">🛡 ${Math.ceil(game.shield)}s</div>`:'')}
  function burst(x,y,c){for(let i=0;i<10;i++)game.particles.push({x,y,vx:(Math.random()-.5)*180,vy:-Math.random()*200,life:.6,c})}
  function screenY(z){return 650-z*510}function screenX(l,z){return W/2+l*(92-45*z)}
  function rr(x,y,w,h,r,fill,stroke){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=stroke=== '#24183e'?5:2;ctx.stroke()}}
  function draw(){ctx.save();let sh=game.shake?Math.random()*8-4:0;ctx.translate(sh,sh);let sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#493787');sky.addColorStop(.45,'#ec7791');sky.addColorStop(1,'#4d235f');ctx.fillStyle=sky;ctx.fillRect(-10,-10,W+20,H+20);
    // Toy store shelves and festive lights
    ctx.fillStyle='#24153d';ctx.fillRect(0,0,55,H);ctx.fillRect(W-55,0,55,H);for(let side of [0,1])for(let i=0;i<7;i++){let y=85+i*112+(game.bg*112);let x=side?382:8;rr(x,y,40,73,7,i%2?'#6942a0':'#cc4c6d');ctx.fillStyle=colors[i%colors.length];ctx.beginPath();ctx.arc(x+20,y+20,10,0,7);ctx.fill();ctx.fillStyle='#ffd879';ctx.fillRect(x+9,y+43,22,7)}
    ctx.fillStyle='#f6c75e';ctx.fillRect(42,120,346,11);for(let i=0;i<9;i++){ctx.fillStyle=colors[i%5];ctx.beginPath();ctx.arc(49+i*42,132,6,0,7);ctx.fill()}
    // perspective floor
    ctx.beginPath();ctx.moveTo(93,H);ctx.lineTo(170,145);ctx.lineTo(260,145);ctx.lineTo(337,H);ctx.fillStyle='#b98985';ctx.fill();
    ctx.beginPath();ctx.moveTo(107,H);ctx.lineTo(176,145);ctx.lineTo(254,145);ctx.lineTo(323,H);ctx.fillStyle='#e5b79d';ctx.fill();
    for(let i=0;i<13;i++){let z=(i/13+game.bg)%1,y=screenY(z),w=250-180*z;ctx.fillStyle='#ffffff24';ctx.fillRect(W/2-w/2,y,w,3)}
    ctx.strokeStyle='#fff6';ctx.lineWidth=3;for(let l of [-.5,.5]){ctx.beginPath();ctx.moveTo(W/2+l*75,145);ctx.lineTo(W/2+l*205,H);ctx.stroke()}
    // overhead signs
    rr(111,154,208,48,13,'#34204d','#ffe175');ctx.fillStyle='#ffe175';ctx.font='800 20px "Baloo 2"';ctx.textAlign='center';ctx.fillText('MUNDO DOS BRINQUEDOS',215,185);
    let sorted=[...game.items].sort((a,b)=>b.z-a.z);for(const it of sorted)drawItem(it);
    drawRunner();for(const p of game.particles){ctx.globalAlpha=p.life/.6;ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,7,7)}ctx.globalAlpha=1;if(game.flash){ctx.fillStyle=`rgba(255,255,255,${game.flash})`;ctx.fillRect(0,0,W,H)}ctx.restore()}
  function drawItem(it){let z=it.z;if(z>1||z<-.1)return;let sc=.18+(1-z)*1.12,x=screenX(it.lane,z),y=screenY(z);ctx.save();ctx.translate(x,y);ctx.scale(sc,sc);
    if(it.type==='brick'){ctx.shadowColor='#ffd72f';ctx.shadowBlur=18;rr(-24,-20,48,36,7,'#ffca32','#6e3f24');ctx.shadowBlur=0;for(let dx of [-13,8]){ctx.fillStyle='#ffed6a';ctx.beginPath();ctx.ellipse(dx,-20,8,5,0,0,7);ctx.fill()}ctx.fillStyle='#fff4a5';ctx.fillRect(-15,-11,8,4)}
    else if(it.type==='power'){ctx.shadowColor='#55f5e5';ctx.shadowBlur=25;ctx.fillStyle='#39d9d0';ctx.beginPath();ctx.arc(0,-17,29,0,7);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#18334d';ctx.font='bold 31px sans-serif';ctx.textAlign='center';ctx.fillText(it.power==='magnet'?'∩':it.power==='shield'?'◆':'⚡',0,-7)}
    else if(it.type==='low'){rr(-48,-45,96,48,9,'#dd4562','#24183e');ctx.fillStyle='#ffe060';for(let i=-30;i<35;i+=30)ctx.fillRect(i,-54,17,12)}
    else if(it.type==='high'){ctx.fillStyle='#7351c9';ctx.fillRect(-55,-130,18,100);ctx.fillRect(37,-130,18,100);rr(-65,-138,130,35,9,'#52d6cb','#24183e');ctx.fillStyle='#fff';ctx.font='800 17px "Baloo 2"';ctx.textAlign='center';ctx.fillText('ABAIXE!',0,-114)}
    else {let h=it.kind==='henrique'?82:104,c=it.kind==='henrique'?'#55d5cd':'#ff667f';ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-h,32,0,7);ctx.fill();rr(-38,-h+18,76,h-15,25,c,'#24183e');ctx.fillStyle='#39223e';ctx.beginPath();ctx.arc(-11,-h-4,4,0,7);ctx.arc(11,-h-4,4,0,7);ctx.fill();ctx.font='800 13px "Baloo 2"';ctx.textAlign='center';ctx.fillStyle='white';ctx.fillText(it.kind==='henrique'?'HENRIQUE':'RAFAELA',0,10)}ctx.restore()}
  function drawRunner(){let x=W/2+game.x,y=690-game.jump,duck=game.duck>0;ctx.save();ctx.translate(x,y);if(game.inv&&Math.floor(game.inv*10)%2)ctx.globalAlpha=.35;ctx.shadowColor='#1b102b';ctx.shadowBlur=18;ctx.fillStyle='#3b2357';ctx.beginPath();ctx.ellipse(0,64,42,12,0,0,7);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='#24203f';ctx.lineWidth=16;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-11,25);ctx.lineTo(-18,67);ctx.moveTo(11,25);ctx.lineTo(21,64);ctx.stroke();ctx.strokeStyle='#ff5d65';ctx.lineWidth=11;ctx.beginPath();ctx.moveTo(-12,58);ctx.lineTo(-22,72);ctx.moveTo(17,58);ctx.lineTo(28,70);ctx.stroke();
    ctx.save();if(duck){ctx.translate(0,23);ctx.scale(1.12,.7)}rr(-39,-43,78,82,29,'#39b5cf','#24183e');ctx.fillStyle='#ffcc72';ctx.beginPath();ctx.arc(0,-67,35,0,7);ctx.fill();ctx.strokeStyle='#24183e';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle='#4b2d28';ctx.beginPath();ctx.arc(0,-77,35,Math.PI,0);ctx.fill();ctx.fillStyle='#f05267';ctx.fillRect(-32,-83,63,10);ctx.fillStyle='#2b2040';ctx.beginPath();ctx.arc(-11,-65,4,0,7);ctx.arc(11,-65,4,0,7);ctx.fill();ctx.beginPath();ctx.arc(0,-53,7,0,Math.PI);ctx.strokeStyle='#2b2040';ctx.lineWidth=3;ctx.stroke();ctx.restore();if(game.shield){ctx.strokeStyle='#65f1e4';ctx.lineWidth=5;ctx.globalAlpha=.7;ctx.beginPath();ctx.arc(0,-10,72,0,7);ctx.stroke()}ctx.restore()}
  function loop(t){if(state!=='play')return;let dt=Math.min(.033,(t-last)/1000||0);last=t;update(dt);draw();raf=requestAnimationFrame(loop)}
  draw();
})();
