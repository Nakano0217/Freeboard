// Simple drawing app: white on black, pen/eraser, clear, thickness
(function(){
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const toolToggle = document.getElementById('toolToggle');
  const clearBtn = document.getElementById('clearBtn');
  const sizeInput = document.getElementById('size');

  let drawing = false;
  let points = [];
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

  // map pointer pressure to a quantized 4096-step multiplier (0.2..1.0 range)
  function pressureToMultiplier(e){
    // pointer.pressure is in [0,1]; fallback to 1 for devices that don't provide pressure
    let p = (typeof e.pressure === 'number' && e.pressure > 0) ? e.pressure : 1;
    // quantize to 4096 discrete steps
    const q = Math.round(p * 4095) / 4095;
    // map to a comfortable multiplier so min width isn't zero
    return 0.2 + 0.8 * q; // ranges 0.2..1.0
  }

  // Pointer-based smooth strokes: accumulate points and draw quadratic curves between midpoints
  canvas.addEventListener('pointerdown', (e)=>{
    e.preventDefault();
    canvas.setPointerCapture(e.pointerId);
    drawing = true;
    points = [];
    const pos = getPos(e);
    points.push(pos, pos); // start with two points for smoothing
    // begin a new path
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener('pointermove', (e)=>{
    if(!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    points.push(pos);

    // draw when we have at least 3 points (using quadratic curve to midpoint)
    if(points.length >= 3){
      const len = points.length;
      const prev = points[len - 3];
      const ctrl = points[len - 2];
      const next = points[len - 1];

      // midpoint between ctrl and next
      const midX = (ctrl.x + next.x) / 2;
      const midY = (ctrl.y + next.y) / 2;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, midX, midY);
      ctx.strokeStyle = (tool === 'pen') ? '#fff' : '#000';
      // set line width using quantized pressure
      const m = pressureToMultiplier(e);
      ctx.lineWidth = Math.max(1, Number(sizeInput.value) * m);
      ctx.stroke();
      // keep last two points to limit memory
      if(points.length > 4) points.splice(0, points.length - 4);
    }
  });

  ['pointerup','pointercancel'].forEach(name => {
    canvas.addEventListener(name, (e)=>{
      if(!drawing) return;
      // finish remaining points by flushing simple lines/curves
      if(points.length === 2){
        // just a dot or short line
        const p = points[points.length - 1];
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, Number(sizeInput.value) / 2), 0, Math.PI * 2);
        ctx.fillStyle = (tool === 'pen') ? '#fff' : '#000';
        ctx.fill();
      } else if(points.length > 2){
        // draw remaining segments
        for(let i = 0; i < points.length - 2; i++){
          const prev = points[i];
          const ctrl = points[i+1];
          const next = points[i+2];
          const midX = (ctrl.x + next.x) / 2;
          const midY = (ctrl.y + next.y) / 2;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.quadraticCurveTo(ctrl.x, ctrl.y, midX, midY);
          ctx.strokeStyle = (tool === 'pen') ? '#fff' : '#000';
          const m = pressureToMultiplier(e);
          ctx.lineWidth = Math.max(1, Number(sizeInput.value) * m);
          ctx.stroke();
        }
      }

      drawing = false;
      try{ canvas.releasePointerCapture(e.pointerId); } catch(_){}
      points = [];
    });
  });

  // prevent default gestures on touch devices
  canvas.addEventListener('touchstart', (e)=> e.preventDefault(), {passive:false});

  // initial tool
  setTool('pen');

  // expose a small API for debugging (optional)
  window._boogie = { clear: () => clearBtn.click(), setTool };
})();
