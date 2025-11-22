// Simple drawing app: white on black, pen/eraser, clear, thickness
(function(){
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const toolToggle = document.getElementById('toolToggle');
  const clearBtn = document.getElementById('clearBtn');
  const sizeInput = document.getElementById('size');

  let drawing = false;
  let points = [];
  let prevMid = null;
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
    prevMid = null;
    const pos = getPos(e);
    points.push(pos);
    // begin a new path
    ctx.beginPath();
    // draw a tiny dot for a click
    ctx.moveTo(pos.x, pos.y);
  });

  canvas.addEventListener('pointermove', (e)=>{
    if(!drawing) return;
    e.preventDefault();
    const pos = getPos(e);
    points.push(pos);

    if(points.length >= 3){
      const len = points.length;
      const ctrl = points[len - 2];
      const next = points[len - 1];
      const mid = { x: (ctrl.x + next.x) / 2, y: (ctrl.y + next.y) / 2 };

      // if this is the first segment, move to the midpoint between first two points
      if(!prevMid){
        const first = points[0];
        const firstMid = { x: (first.x + ctrl.x) / 2, y: (first.y + ctrl.y) / 2 };
        prevMid = firstMid;
      }

      ctx.beginPath();
      ctx.moveTo(prevMid.x, prevMid.y);
      ctx.quadraticCurveTo(ctrl.x, ctrl.y, mid.x, mid.y);
      ctx.strokeStyle = (tool === 'pen') ? '#fff' : '#000';
      const m = pressureToMultiplier(e);
      ctx.lineWidth = Math.max(1, Number(sizeInput.value) * m);
      ctx.stroke();

      prevMid = mid;
      // keep last few points
      if(points.length > 5) points.splice(0, points.length - 5);
    }
  });

  ['pointerup','pointercancel'].forEach(name => {
    canvas.addEventListener(name, (e)=>{
      if(!drawing) return;
      // flush final segment
      if(points.length === 1){
        const p = points[0];
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, Number(sizeInput.value) / 2), 0, Math.PI * 2);
        ctx.fillStyle = (tool === 'pen') ? '#fff' : '#000';
        ctx.fill();
      } else if(points.length >= 2){
        // draw the final curve to the last point
        const last = points[points.length - 1];
        const ctrl = points[points.length - 2];
        ctx.beginPath();
        if(!prevMid){
          ctx.moveTo(ctrl.x, ctrl.y);
        } else {
          ctx.moveTo(prevMid.x, prevMid.y);
        }
        ctx.quadraticCurveTo(ctrl.x, ctrl.y, last.x, last.y);
        ctx.strokeStyle = (tool === 'pen') ? '#fff' : '#000';
        const m = pressureToMultiplier(e);
        ctx.lineWidth = Math.max(1, Number(sizeInput.value) * m);
        ctx.stroke();
      }

      drawing = false;
      try{ canvas.releasePointerCapture(e.pointerId); } catch(_){}
      points = [];
      prevMid = null;
    });
  });

  // prevent default gestures on touch devices
  canvas.addEventListener('touchstart', (e)=> e.preventDefault(), {passive:false});

  // initial tool
  setTool('pen');

  // expose a small API for debugging (optional)
  window._boogie = { clear: () => clearBtn.click(), setTool };
})();
