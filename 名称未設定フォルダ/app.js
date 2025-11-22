// Simple drawing app: white on black, pen/eraser, clear, thickness
(function(){
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const toolToggle = document.getElementById('toolToggle');
  const clearBtn = document.getElementById('clearBtn');
  const sizeInput = document.getElementById('size');

  let drawing = false;
  let last = {x:0,y:0};
  let tool = 'pen'; // 'pen' or 'eraser'

  function resizeCanvas(){
    // Reset transforms then size to avoid cumulative scaling
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(window.innerWidth);
    const h = Math.floor(window.innerHeight);
    // reset
    ctx.setTransform(1,0,0,1,0,0);
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);
    // fill black background so eraser can draw black
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,w,h);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  function setTool(t){
    tool = t;
    // update single toggle button UI
    if(toolToggle){
      if(t === 'pen'){
        toolToggle.innerText = 'ペン';
        toolToggle.title = 'ペン';
        toolToggle.setAttribute('aria-pressed','true');
        toolToggle.classList.add('active');
      } else {
        toolToggle.innerText = '消しゴム';
        toolToggle.title = '消しゴム';
        toolToggle.setAttribute('aria-pressed','false');
        toolToggle.classList.remove('active');
      }
    }
    // cursor feedback
    canvas.style.cursor = (t === 'pen') ? 'crosshair' : 'cell';
  }

  if(toolToggle){
    toolToggle.addEventListener('click', ()=> setTool(tool === 'pen' ? 'eraser' : 'pen'));
  }

  clearBtn.addEventListener('click', ()=>{
    // clear to black
    ctx.setTransform(1,0,0,1,0,0);
    resizeCanvas();
    setTool('pen');
  });

  function getPos(e){
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', (e)=>{
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    last = getPos(e);
  });

  canvas.addEventListener('pointermove', (e)=>{
    if(!drawing) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = (tool === 'pen') ? '#fff' : '#000';
    ctx.lineWidth = Number(sizeInput.value);
    ctx.stroke();
    last = p;
  });

  ['pointerup','pointercancel'].forEach(name => {
    canvas.addEventListener(name, (e)=>{
      drawing = false;
      try{ canvas.releasePointerCapture(e.pointerId); } catch(_){}
    });
  });

  // prevent default gestures on touch devices
  canvas.addEventListener('touchstart', (e)=> e.preventDefault(), {passive:false});

  // initial tool
  setTool('pen');

  // expose a small API for debugging (optional)
  window._boogie = { clear: () => clearBtn.click(), setTool };
})();
