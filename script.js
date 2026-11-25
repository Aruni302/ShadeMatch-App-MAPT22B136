'use strict';
// =====================================================================
// SHADE MATCH – COMPLETE APPLICATION
// =====================================================================

// ===== COLOUR SCIENCE ENGINE =====
const ColourSci = {
  toLinear(c) {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  },
  rgbToXYZ(r, g, b) {
    const rl = this.toLinear(r), gl = this.toLinear(g), bl = this.toLinear(b);
    return {
      X: rl*0.4124564 + gl*0.3575761 + bl*0.1804375,
      Y: rl*0.2126729 + gl*0.7151522 + bl*0.0721750,
      Z: rl*0.0193339 + gl*0.1191920 + bl*0.9503041
    };
  },
  xyzToLab(X, Y, Z) {
    const Xn=0.95047, Yn=1.00000, Zn=1.08883;
    const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787*t + 16/116;
    return { L: 116*f(Y/Yn)-16, a: 500*(f(X/Xn)-f(Y/Yn)), b: 200*(f(Y/Yn)-f(Z/Zn)) };
  },
  rgbToLab(r, g, b) { const xyz = this.rgbToXYZ(r,g,b); return this.xyzToLab(xyz.X, xyz.Y, xyz.Z); },
  rgbToHex(r, g, b) { return '#'+[r,g,b].map(v=>Math.round(v).toString(16).padStart(2,'0')).join(''); },
  rgbToHSL(r, g, b) {
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h, s, l=(max+min)/2;
    if(max===min){h=s=0;}else{
      const d=max-min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h=((g-b)/d+(g<b?6:0))/6; break;
        case g: h=((b-r)/d+2)/6; break;
        case b: h=((r-g)/d+4)/6; break;
      }
    }
    return {h:Math.round(h*360), s:Math.round(s*100), l:Math.round(l*100)};
  },
  deltaE2000(lab1, lab2) {
    const {L:L1,a:a1,b:b1}=lab1, {L:L2,a:a2,b:b2}=lab2;
    const kL=1,kC=1,kH=1;
    const c1=Math.sqrt(a1*a1+b1*b1), c2=Math.sqrt(a2*a2+b2*b2);
    const cAvg=(c1+c2)/2, c7=Math.pow(cAvg,7);
    const G=0.5*(1-Math.sqrt(c7/(c7+Math.pow(25,7))));
    const a1p=a1*(1+G), a2p=a2*(1+G);
    const c1p=Math.sqrt(a1p*a1p+b1*b1), c2p=Math.sqrt(a2p*a2p+b2*b2);
    const atan2d=(y,x)=>{let v=Math.atan2(y,x)*180/Math.PI; return v<0?v+360:v;};
    const h1p=c1p===0?0:atan2d(b1,a1p), h2p=c2p===0?0:atan2d(b2,a2p);
    const dLp=L2-L1, dCp=c2p-c1p;
    let dhp=0;
    if(c1p*c2p!==0){
      if(Math.abs(h2p-h1p)<=180) dhp=h2p-h1p;
      else if(h2p-h1p>180) dhp=h2p-h1p-360;
      else dhp=h2p-h1p+360;
    }
    const dHp=2*Math.sqrt(c1p*c2p)*Math.sin(dhp*Math.PI/360);
    const Lp=(L1+L2)/2, Cp=(c1p+c2p)/2;
    let Hp;
    if(c1p*c2p===0) Hp=h1p+h2p;
    else if(Math.abs(h1p-h2p)<=180) Hp=(h1p+h2p)/2;
    else if(h1p+h2p<360) Hp=(h1p+h2p+360)/2;
    else Hp=(h1p+h2p-360)/2;
    const T=1-0.17*Math.cos((Hp-30)*Math.PI/180)+0.24*Math.cos(2*Hp*Math.PI/180)+0.32*Math.cos((3*Hp+6)*Math.PI/180)-0.20*Math.cos((4*Hp-63)*Math.PI/180);
    const dTheta=30*Math.exp(-Math.pow((Hp-275)/25,2));
    const Cp7=Math.pow(Cp,7), RC=2*Math.sqrt(Cp7/(Cp7+Math.pow(25,7)));
    const SL=1+0.015*Math.pow(Lp-50,2)/Math.sqrt(20+Math.pow(Lp-50,2));
    const SC=1+0.045*Cp, SH=1+0.015*Cp*T;
    const RT=-Math.sin(2*dTheta*Math.PI/180)*RC;
    return Math.sqrt(Math.pow(dLp/(kL*SL),2)+Math.pow(dCp/(kC*SC),2)+Math.pow(dHp/(kH*SH),2)+RT*(dCp/(kC*SC))*(dHp/(kH*SH)));
  },
  deltaE76(lab1, lab2) {
    return Math.sqrt(Math.pow(lab2.L-lab1.L,2)+Math.pow(lab2.a-lab1.a,2)+Math.pow(lab2.b-lab1.b,2));
  },
  samplePixels(pixels) {
    const rs=[],gs=[],bs=[];
    for(let i=0;i<pixels.length;i+=4){
      if(pixels[i+3]<128) continue;
      rs.push(pixels[i]); gs.push(pixels[i+1]); bs.push(pixels[i+2]);
    }
    if(!rs.length) return {r:128,g:128,b:128};
    const trim=arr=>{
      arr.sort((a,b)=>a-b);
      const cut=Math.floor(arr.length*0.1);
      const s=arr.slice(cut,arr.length-cut);
      return s.reduce((a,b)=>a+b,0)/s.length;
    };
    return {r:Math.round(trim(rs)),g:Math.round(trim(gs)),b:Math.round(trim(bs))};
  },
  getVerdict(de) {
    if(de<1.0) return {label:'Excellent Match',key:'excellent',cls:'badge-success',color:'#22c55e',textColor:'#15803d'};
    if(de<2.0) return {label:'Good Match',key:'good',cls:'badge-success',color:'#84cc16',textColor:'#3f6212'};
    if(de<3.5) return {label:'Acceptable',key:'acceptable',cls:'badge-warning',color:'#f59e0b',textColor:'#a16207'};
    if(de<5.0) return {label:'Warning',key:'warning',cls:'badge-orange',color:'#f97316',textColor:'#c2410c'};
    return {label:'Shade Mismatch',key:'mismatch',cls:'badge-danger',color:'#ef4444',textColor:'#b91c1c'};
  },
  describeDiff(ref, test) {
    const dL=test.L-ref.L, da=test.a-ref.a, db=test.b-ref.b;
    const parts=[];
    if(Math.abs(dL)>0.5) parts.push(dL>0?'lighter':'darker');
    if(Math.abs(da)>0.5) parts.push(da>0?'more red':'more green');
    if(Math.abs(db)>0.5) parts.push(db>0?'more yellow':'more blue');
    const c1=Math.sqrt(ref.a**2+ref.b**2), c2=Math.sqrt(test.a**2+test.b**2);
    if(Math.abs(c2-c1)>1) parts.push(c2>c1?'more saturated':'less saturated');
    return parts.length?'Test batch is '+parts.join(', ')+' than reference':'Very similar to reference';
  }
};

// ===== APP STATE =====
let DB = null;
const APP = {
  batches: [],
  comparisons: [],
  settings: { tolerance: 3.0, inspector: '', darkMode: false },
  currentBatchId: null,
  batchStep: 1,
  uploadedImageData: null,
  sampledColour: null,
  compResults: null
};

// ===== INDEXED DB =====
function initDB() {
  return new Promise(resolve => {
    if(!window.indexedDB){ resolve(null); return; }
    const req = indexedDB.open('ShadeMatchDB', 2);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains('batches')) db.createObjectStore('batches',{keyPath:'id'});
      if(!db.objectStoreNames.contains('comparisons')) db.createObjectStore('comparisons',{keyPath:'id'});
    };
    req.onsuccess = e => { DB = e.target.result; resolve(DB); };
    req.onerror = () => resolve(null);
  });
}

function dbGet(store) {
  if(!DB){
    try{ return Promise.resolve(JSON.parse(localStorage.getItem('sm_'+store)||'[]')); }
    catch{ return Promise.resolve([]); }
  }
  return new Promise(resolve=>{
    const tx=DB.transaction(store,'readonly');
    const req=tx.objectStore(store).getAll();
    req.onsuccess=()=>resolve(req.result||[]);
    req.onerror=()=>resolve([]);
  });
}

function dbPut(store, item) {
  if(!DB){
    const arr=JSON.parse(localStorage.getItem('sm_'+store)||'[]');
    const idx=arr.findIndex(x=>x.id===item.id);
    if(idx>=0) arr[idx]=item; else arr.push(item);
    localStorage.setItem('sm_'+store,JSON.stringify(arr));
    return Promise.resolve();
  }
  return new Promise((resolve,reject)=>{
    const tx=DB.transaction(store,'readwrite');
    tx.objectStore(store).put(item);
    tx.oncomplete=resolve; tx.onerror=reject;
  });
}

function dbDelete(store, id) {
  if(!DB){
    let arr=JSON.parse(localStorage.getItem('sm_'+store)||'[]');
    arr=arr.filter(x=>x.id!==id);
    localStorage.setItem('sm_'+store,JSON.stringify(arr));
    return Promise.resolve();
  }
  return new Promise((resolve,reject)=>{
    const tx=DB.transaction(store,'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete=resolve; tx.onerror=reject;
  });
}

function dbClear(store) {
  if(!DB){ localStorage.removeItem('sm_'+store); return Promise.resolve(); }
  return new Promise(resolve=>{
    const tx=DB.transaction(store,'readwrite');
    tx.objectStore(store).clear();
    tx.oncomplete=resolve;
  });
}

async function loadAllData() {
  APP.batches = await dbGet('batches');
  APP.comparisons = await dbGet('comparisons');
}

// ===== SETTINGS =====
function loadSettings() {
  try { const s=JSON.parse(localStorage.getItem('sm_settings')||'{}'); APP.settings={tolerance:3.0,inspector:'',darkMode:false,...s}; }
  catch { APP.settings={tolerance:3.0,inspector:'',darkMode:false}; }
  applyTheme(APP.settings.darkMode);
  document.getElementById('settingsDark').checked=APP.settings.darkMode;
  document.getElementById('settingsTolerance').value=APP.settings.tolerance;
  document.getElementById('settingsToleranceNum').value=APP.settings.tolerance;
  document.getElementById('settingsInspector').value=APP.settings.inspector||'';
  document.getElementById('compareTolerance').value=APP.settings.tolerance;
  document.getElementById('compareToleranceVal').textContent=APP.settings.tolerance;
}

function saveSettings() {
  APP.settings.tolerance=parseFloat(document.getElementById('settingsTolerance').value);
  APP.settings.inspector=document.getElementById('settingsInspector').value;
  APP.settings.darkMode=document.getElementById('settingsDark').checked;
  localStorage.setItem('sm_settings',JSON.stringify(APP.settings));
  document.getElementById('compareTolerance').value=APP.settings.tolerance;
  document.getElementById('compareToleranceVal').textContent=APP.settings.tolerance;
  showToast('Settings saved','success');
}

function applyTheme(dark) {
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  const icon=document.getElementById('themeIcon');
  if(dark) icon.innerHTML='<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  else icon.innerHTML='<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
}

function syncTolerance(v) { document.getElementById('compareToleranceVal').textContent=parseFloat(v).toFixed(1); }
function syncSettingsTolerance(v) { document.getElementById('settingsToleranceNum').value=parseFloat(v).toFixed(1); }
function syncSettingsToleranceFromNum(v) {
  const n=Math.min(10,Math.max(0.5,parseFloat(v)||3));
  document.getElementById('settingsTolerance').value=n;
}

// ===== NAVIGATION =====
const PAGE_TITLES = {
  'dashboard':'Dashboard','add-batch':'Add New Batch','batches':'Fabric Batches',
  'compare':'Compare Batches','history':'History & Reports','settings':'Settings'
};

function navigate(page, params={}) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('[data-page]').forEach(n=>n.classList.remove('active'));
  const pg=document.getElementById('page-'+page);
  if(pg) pg.classList.add('active');
  document.querySelectorAll('[data-page="'+page+'"]').forEach(n=>n.classList.add('active'));
  document.getElementById('topbarTitle').textContent=PAGE_TITLES[page]||page;
  window.history.replaceState(null,'','#'+page);
  if(page==='dashboard') renderDashboard();
  if(page==='batches') renderBatchesPage();
  if(page==='compare') renderComparePage(params);
  if(page==='history') renderHistoryPage();
  if(page==='add-batch' && !params.editing) resetBatchForm();
  window.scrollTo({top:0,behavior:'smooth'});
}

// ===== DASHBOARD =====
function renderDashboard() {
  document.getElementById('stat-batches').textContent=APP.batches.length;
  document.getElementById('stat-orders').textContent=new Set(APP.batches.map(b=>b.orderNum)).size;
  document.getElementById('stat-comparisons').textContent=APP.comparisons.length;
  const mis=APP.comparisons.filter(c=>c.overallVerdict==='mismatch'||c.overallVerdict==='warning').length;
  document.getElementById('stat-mismatch').textContent=(APP.comparisons.length?Math.round(mis/APP.comparisons.length*100):0)+'%';
  const h=new Date().getHours();
  document.getElementById('dashGreeting').textContent=(h<12?'Good morning':h<17?'Good afternoon':'Good evening')+' — quality control at a glance';
  const rb=document.getElementById('recentBatchesList');
  const recent=[...APP.batches].sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
  if(!recent.length){rb.innerHTML='<div class="empty-state" style="padding:30px 10px"><p>No batches yet — add your first batch</p></div>';return;}
  rb.innerHTML=recent.map(b=>`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="viewBatch('${b.id}')">
      <div style="width:36px;height:36px;border-radius:6px;background:${b.colour?.hex||'#ccc'};border:2px solid var(--border);flex-shrink:0"></div>
      <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">${esc(b.batchNum)}</div><div style="font-size:12px;color:var(--text2)">${esc(b.orderNum)} · ${esc(b.colourName||'—')}</div></div>
      <div style="font-size:11px;color:var(--text3);white-space:nowrap">${fmtDate(b.createdAt)}</div>
    </div>`).join('');
  const rh=document.getElementById('recentHistoryList');
  const rc=[...APP.comparisons].sort((a,b)=>b.createdAt-a.createdAt).slice(0,5);
  if(!rc.length){rh.innerHTML='<div class="empty-state" style="padding:30px 10px"><p>No comparisons yet</p></div>';return;}
  rh.innerHTML=rc.map(c=>{const v=ColourSci.getVerdict(c.maxDE||0);return`
    <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="viewReport('${c.id}')">
      <div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13.5px">${esc(c.orderNum)}</div><div style="font-size:12px;color:var(--text2)">Ref: ${esc(c.refBatchNum)}</div></div>
      <span class="badge ${v.cls}">${v.label}</span>
    </div>`;}).join('');
}

// ===== BATCH FORM =====
function resetBatchForm() {
  APP.batchStep=1; APP.uploadedImageData=null; APP.sampledColour=null; APP.currentBatchId=null;
  ['fBatchNum','fOrderNum','fSupplier','fColourName','fNotes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const ft=document.getElementById('fFabricType'); if(ft) ft.value='';
  document.getElementById('fDateReceived').value=new Date().toISOString().split('T')[0];
  document.getElementById('batchFormTitle').textContent='Add New Batch';
  showBatchStep(1);
  clearImage();
}

function showBatchStep(n) {
  [1,2,3].forEach(i=>{const el=document.getElementById('batchStep'+i);if(el)el.style.display=i===n?'block':'none';});
  updateStepIndicator(n);
}

function updateStepIndicator(n) {
  [1,2,3].forEach(i=>{
    const el=document.getElementById('step'+i);
    if(!el) return;
    el.classList.remove('active','done');
    if(i<n) el.classList.add('done');
    else if(i===n) el.classList.add('active');
  });
}

function batchNextStep(from) {
  if(from===1){
    const bn=document.getElementById('fBatchNum').value.trim();
    const on=document.getElementById('fOrderNum').value.trim();
    if(!bn){showToast('Batch Number is required','error');return;}
    if(!on){showToast('Order Number is required','error');return;}
    const ex=APP.batches.find(b=>b.batchNum.toLowerCase()===bn.toLowerCase()&&b.id!==APP.currentBatchId);
    if(ex){showToast('Batch number already exists: '+bn,'error');return;}
    APP.batchStep=2;
  } else if(from===2){
    APP.batchStep=3;
    setTimeout(()=>{if(APP.uploadedImageData)initSampler();else showNoImageSampler();},100);
  }
  showBatchStep(APP.batchStep);
}

function batchPrevStep(from) { APP.batchStep=from-1; showBatchStep(APP.batchStep); }
function skipImage() { APP.batchStep=3; showBatchStep(3); setTimeout(()=>showNoImageSampler(),50); }

// ===== IMAGE HANDLING =====
function handleImageUpload(event) {
  const file=event.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')){showToast('Please select a valid image file','error');return;}
  if(file.size>20*1024*1024){showToast('Image too large (max 20MB)','error');return;}
  const reader=new FileReader();
  reader.onload=e=>processImageData(e.target.result,file.name);
  reader.readAsDataURL(file);
  event.target.value='';
}

function processImageData(dataUrl, name) {
  const img=new Image();
  img.onload=()=>{
    const maxW=600;
    let w=img.width, h=img.height;
    if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
    const cv=document.createElement('canvas');
    cv.width=w; cv.height=h;
    cv.getContext('2d').drawImage(img,0,0,w,h);
    const resized=cv.toDataURL('image/jpeg',0.88);
    APP.uploadedImageData=resized;
    document.getElementById('imgPreview').src=resized;
    document.getElementById('imgPreviewWrap').style.display='';
    document.getElementById('uploadZone').style.display='none';
    document.getElementById('imgInfo').textContent=w+'×'+h+'px'+(name?' · '+name.substring(0,30):'');
    document.getElementById('nextToSampleBtn').disabled=false;
  };
  img.src=dataUrl;
}

function clearImage() {
  APP.uploadedImageData=null;
  const ip=document.getElementById('imgPreview'); if(ip) ip.src='';
  const ipw=document.getElementById('imgPreviewWrap'); if(ipw) ipw.style.display='none';
  const uz=document.getElementById('uploadZone'); if(uz) uz.style.display='';
  const nb=document.getElementById('nextToSampleBtn'); if(nb) nb.disabled=true;
}

// ===== CAMERA =====
let cameraStream=null;
async function openCamera() {
  try {
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280},height:{ideal:720}}});
    document.getElementById('cameraVideo').srcObject=cameraStream;
    openModal('cameraModal');
  } catch(err) {
    if(err.name==='NotAllowedError') showToast('Camera permission denied','error');
    else if(err.name==='NotFoundError'){showToast('No camera found — using file upload','warning');document.getElementById('cameraInput').click();}
    else showToast('Camera error: '+err.message,'error');
  }
}

function capturePhoto() {
  const video=document.getElementById('cameraVideo');
  const canvas=document.getElementById('cameraCanvas');
  canvas.width=video.videoWidth; canvas.height=video.videoHeight;
  canvas.getContext('2d').drawImage(video,0,0);
  const dataUrl=canvas.toDataURL('image/jpeg',0.9);
  stopCamera();
  processImageData(dataUrl,'camera_photo.jpg');
}

function stopCamera() {
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}
  closeModal('cameraModal');
}

// ===== COLOUR SAMPLER =====
let SC={canvas:null,ctx:null,box:{x:0,y:0,w:0,h:0},dragging:false,resizing:false,dragStart:{x:0,y:0,bx:0,by:0},resizeStart:{x:0,y:0,bw:0,bh:0},debounce:null};

function initSampler() {
  document.getElementById('noImageSampler').style.display='none';
  SC.canvas=document.getElementById('samplerCanvas');
  SC.ctx=SC.canvas.getContext('2d');
  const img=new Image();
  img.onload=()=>{
    const container=document.getElementById('samplerContainer');
    const maxW=Math.min(container.clientWidth||400,500);
    let w=img.width, h=img.height;
    const scale=Math.min(maxW/w,400/h,1);
    SC.canvas.width=Math.round(w*scale);
    SC.canvas.height=Math.round(h*scale);
    SC.ctx.drawImage(img,0,0,SC.canvas.width,SC.canvas.height);
    resetSamplerBox();
    bindSamplerEvents();
    sampleCurrentArea();
  };
  img.src=APP.uploadedImageData;
}

function showNoImageSampler() {
  document.getElementById('noImageSampler').style.display='';
  document.getElementById('colourPreview').style.background='#aaaaaa';
  document.getElementById('samplerBox').style.display='none';
}

function resetSamplerBox() {
  if(!SC.canvas) return;
  const cw=SC.canvas.width, ch=SC.canvas.height;
  const bw=Math.round(cw*0.35), bh=Math.round(ch*0.35);
  SC.box={x:Math.round((cw-bw)/2),y:Math.round((ch-bh)/2),w:bw,h:bh};
  document.getElementById('samplerBox').style.display='';
  updateSamplerBoxEl();
  sampleCurrentArea();
}

function updateSamplerBoxEl() {
  const container=document.getElementById('samplerContainer');
  const boxEl=document.getElementById('samplerBox');
  if(!container||!boxEl||!SC.canvas) return;
  const rect=SC.canvas.getBoundingClientRect();
  const cRect=container.getBoundingClientRect();
  const sx=SC.canvas.width?rect.width/SC.canvas.width:1;
  const sy=SC.canvas.height?rect.height/SC.canvas.height:1;
  const ox=rect.left-cRect.left, oy=rect.top-cRect.top;
  boxEl.style.left=(ox+SC.box.x*sx)+'px';
  boxEl.style.top=(oy+SC.box.y*sy)+'px';
  boxEl.style.width=(SC.box.w*sx)+'px';
  boxEl.style.height=(SC.box.h*sy)+'px';
}

function bindSamplerEvents() {
  const boxEl=document.getElementById('samplerBox');
  const resizeEl=document.getElementById('samplerResize');
  const getCanvasScale=()=>{
    const rect=SC.canvas.getBoundingClientRect();
    return {sx:SC.canvas.width/rect.width,sy:SC.canvas.height/rect.height};
  };
  const onMove=e=>{
    if(e.cancelable) e.preventDefault();
    const clientX=e.touches?e.touches[0].clientX:e.clientX;
    const clientY=e.touches?e.touches[0].clientY:e.clientY;
    const {sx,sy}=getCanvasScale();
    if(SC.dragging){
      const dx=(clientX-SC.dragStart.x)*sx, dy=(clientY-SC.dragStart.y)*sy;
      SC.box.x=Math.max(0,Math.min(SC.canvas.width-SC.box.w,SC.dragStart.bx+dx));
      SC.box.y=Math.max(0,Math.min(SC.canvas.height-SC.box.h,SC.dragStart.by+dy));
      updateSamplerBoxEl();
      clearTimeout(SC.debounce); SC.debounce=setTimeout(sampleCurrentArea,60);
    }
    if(SC.resizing){
      const dx=(clientX-SC.resizeStart.x)*sx, dy=(clientY-SC.resizeStart.y)*sy;
      SC.box.w=Math.max(20,Math.min(SC.canvas.width-SC.box.x,SC.resizeStart.bw+dx));
      SC.box.h=Math.max(20,Math.min(SC.canvas.height-SC.box.y,SC.resizeStart.bh+dy));
      updateSamplerBoxEl();
      clearTimeout(SC.debounce); SC.debounce=setTimeout(sampleCurrentArea,60);
    }
  };
  const onUp=()=>{SC.dragging=false;SC.resizing=false;sampleCurrentArea();};
  boxEl.addEventListener('mousedown',e=>{SC.dragging=true;SC.dragStart={x:e.clientX,y:e.clientY,bx:SC.box.x,by:SC.box.y};e.preventDefault();});
  boxEl.addEventListener('touchstart',e=>{SC.dragging=true;SC.dragStart={x:e.touches[0].clientX,y:e.touches[0].clientY,bx:SC.box.x,by:SC.box.y};},{passive:false});
  resizeEl.addEventListener('mousedown',e=>{SC.resizing=true;SC.dragging=false;SC.resizeStart={x:e.clientX,y:e.clientY,bw:SC.box.w,bh:SC.box.h};e.stopPropagation();e.preventDefault();});
  resizeEl.addEventListener('touchstart',e=>{SC.resizing=true;SC.dragging=false;SC.resizeStart={x:e.touches[0].clientX,y:e.touches[0].clientY,bw:SC.box.w,bh:SC.box.h};e.stopPropagation();},{passive:false});
  document.addEventListener('mousemove',onMove);
  document.addEventListener('touchmove',onMove,{passive:false});
  document.addEventListener('mouseup',onUp);
  document.addEventListener('touchend',onUp);
}

function sampleCurrentArea() {
  if(!SC.ctx||!SC.canvas) return;
  const x=Math.round(SC.box.x), y=Math.round(SC.box.y);
  const w=Math.max(1,Math.round(SC.box.w)), h=Math.max(1,Math.round(SC.box.h));
  let imageData;
  try{imageData=SC.ctx.getImageData(x,y,w,h);}catch{return;}
  const {r,g,b}=ColourSci.samplePixels(imageData.data);
  const hex=ColourSci.rgbToHex(r,g,b);
  const hsl=ColourSci.rgbToHSL(r,g,b);
  const lab=ColourSci.rgbToLab(r,g,b);
  APP.sampledColour={r,g,b,hex,hsl,lab};
  document.getElementById('colourPreview').style.background=hex;
  document.getElementById('cvHex').textContent=hex.toUpperCase();
  document.getElementById('cvRgb').textContent=r+', '+g+', '+b;
  document.getElementById('cvHsl').textContent=hsl.h+'°, '+hsl.s+'%, '+hsl.l+'%';
  document.getElementById('cvLab').textContent='L*'+lab.L.toFixed(1)+'  a*'+lab.a.toFixed(1)+'  b*'+lab.b.toFixed(1);
}

// ===== SAVE BATCH =====
async function saveBatch() {
  const btn=document.getElementById('saveBatchBtn');
  btn.disabled=true;
  btn.innerHTML='<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Saving...';
  try {
    const id=APP.currentBatchId||'B'+Date.now();
    const existing=APP.batches.find(b=>b.id===id);
    const batch={
      id,
      batchNum:document.getElementById('fBatchNum').value.trim(),
      orderNum:document.getElementById('fOrderNum').value.trim(),
      fabricType:document.getElementById('fFabricType').value,
      supplier:document.getElementById('fSupplier').value.trim(),
      colourName:document.getElementById('fColourName').value.trim(),
      dateReceived:document.getElementById('fDateReceived').value,
      notes:document.getElementById('fNotes').value.trim(),
      imageData:APP.uploadedImageData,
      colour:APP.sampledColour,
      createdAt:existing?.createdAt||Date.now(),
      updatedAt:Date.now()
    };
    await dbPut('batches',batch);
    const idx=APP.batches.findIndex(b=>b.id===id);
    if(idx>=0) APP.batches[idx]=batch; else APP.batches.push(batch);
    showToast('Batch '+batch.batchNum+' saved!','success');
    resetBatchForm();
    navigate('batches');
  } catch(err) {
    showToast('Error saving: '+err.message,'error');
  } finally {
    btn.disabled=false;
    btn.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>Save Batch';
  }
}

// ===== BATCHES PAGE =====
function renderBatchesPage() { populateBatchFilterOrders(); renderBatches(); }

function populateBatchFilterOrders() {
  const sel=document.getElementById('batchFilterOrder');
  const orders=[...new Set(APP.batches.map(b=>b.orderNum))].sort();
  sel.innerHTML='<option value="">All Orders</option>'+orders.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('');
}

function renderBatches() {
  const search=(document.getElementById('batchSearch')?.value||'').toLowerCase();
  const filterOrder=document.getElementById('batchFilterOrder')?.value||'';
  const sort=document.getElementById('batchSort')?.value||'date-desc';
  let batches=APP.batches.filter(b=>{
    if(filterOrder&&b.orderNum!==filterOrder) return false;
    if(search&&!b.batchNum.toLowerCase().includes(search)&&!b.orderNum.toLowerCase().includes(search)) return false;
    return true;
  });
  batches.sort((a,b)=>{
    if(sort==='date-desc') return b.createdAt-a.createdAt;
    if(sort==='date-asc') return a.createdAt-b.createdAt;
    if(sort==='batch-asc') return a.batchNum.localeCompare(b.batchNum);
    if(sort==='batch-desc') return b.batchNum.localeCompare(a.batchNum);
    if(sort==='order-asc') return a.orderNum.localeCompare(b.orderNum);
    return 0;
  });
  document.getElementById('batchesCount').textContent=batches.length+' batch'+(batches.length!==1?'es':'')+' found';
  const grid=document.getElementById('batchesGrid');
  if(!batches.length){
    grid.innerHTML=`<div class="empty-state" style="grid-column:1/-1"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg><h3>No batches found</h3><p>Add your first fabric batch to get started</p><button class="btn btn-primary" onclick="navigate('add-batch')">Add Batch</button></div>`;
    return;
  }
  grid.innerHTML=batches.map(batchCardHTML).join('');
}

function batchCardHTML(b) {
  const colHex=b.colour?.hex||'#cccccc';
  const hasImg=!!b.imageData;
  return `<div class="batch-card fade-in" onclick="viewBatch('${b.id}')">
    <div class="batch-card-img" style="${!hasImg?'background:'+colHex:''}">
      ${hasImg?`<img src="${b.imageData}" alt="${esc(b.batchNum)}" loading="lazy">`:`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.7);font-size:11px;font-weight:600">NO IMAGE</div>`}
    </div>
    <div class="batch-card-body">
      <div class="batch-card-num">${esc(b.batchNum)}</div>
      <div class="batch-card-order">${esc(b.orderNum)}${b.fabricType?' · '+esc(b.fabricType):''}</div>
      ${b.colour?`<div class="batch-card-color"><div class="color-swatch" style="background:${b.colour.hex}"></div><span style="font-size:12px;color:var(--text2)">${b.colour.hex.toUpperCase()}${b.colourName?' · '+esc(b.colourName):''}</span></div>`:(b.colourName?`<div style="font-size:12px;color:var(--text2);margin-bottom:10px">${esc(b.colourName)}</div>`:'')}
      <div class="batch-card-actions" onclick="event.stopPropagation()">
        <button class="btn btn-outline btn-sm" onclick="viewBatch('${b.id}')">Details</button>
        <button class="btn btn-ghost btn-sm" onclick="editBatch('${b.id}')">Edit</button>
        <button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmDeleteBatch('${b.id}')">Delete</button>
      </div>
    </div>
  </div>`;
}

function viewBatch(id) {
  const b=APP.batches.find(x=>x.id===id);
  if(!b) return;
  document.getElementById('batchDetailTitle').textContent=b.batchNum;
  const colHex=b.colour?.hex||'#ccc';
  document.getElementById('batchDetailBody').innerHTML=`
    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px">
      ${b.imageData?`<img src="${b.imageData}" style="width:200px;height:150px;object-fit:cover;border-radius:var(--radius-sm);border:2px solid var(--border)">`:`<div style="width:200px;height:150px;background:${colHex};border-radius:var(--radius-sm);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;color:rgba(0,0,0,0.4);font-size:12px">No image</div>`}
      <div style="flex:1;min-width:180px"><div class="grid" style="gap:10px">
        ${ir('Batch Number',b.batchNum)}${ir('Order Number',b.orderNum)}
        ${ir('Fabric Type',b.fabricType||'—')}${ir('Supplier',b.supplier||'—')}
        ${ir('Colour Name',b.colourName||'—')}${ir('Date Received',b.dateReceived||'—')}
        ${ir('Added',new Date(b.createdAt).toLocaleString())}
      </div></div>
    </div>
    ${b.colour?`<div class="card" style="background:var(--surface2)"><div class="card-title">Sampled Colour</div>
      <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
        <div style="width:60px;height:60px;border-radius:10px;background:${b.colour.hex};border:2px solid var(--border)"></div>
        <div class="colour-values" style="flex:1;min-width:200px">
          <div class="colour-val-item"><div class="colour-val-label">HEX</div><div class="colour-val-value">${b.colour.hex.toUpperCase()}</div></div>
          <div class="colour-val-item"><div class="colour-val-label">RGB</div><div class="colour-val-value">${b.colour.r}, ${b.colour.g}, ${b.colour.b}</div></div>
          <div class="colour-val-item"><div class="colour-val-label">HSL</div><div class="colour-val-value">${b.colour.hsl?.h}°, ${b.colour.hsl?.s}%, ${b.colour.hsl?.l}%</div></div>
          <div class="colour-val-item"><div class="colour-val-label">CIELAB</div><div class="colour-val-value">L*${b.colour.lab?.L?.toFixed(1)} a*${b.colour.lab?.a?.toFixed(1)} b*${b.colour.lab?.b?.toFixed(1)}</div></div>
        </div>
      </div></div>`:''}
    ${b.notes?`<div style="margin-top:12px;padding:12px;background:var(--surface2);border-radius:var(--radius-sm);font-size:13.5px;color:var(--text2)">${esc(b.notes)}</div>`:''}`;
  document.getElementById('batchDetailCompareBtn').onclick=()=>{closeModal('batchDetailModal');navigate('compare',{refId:id});};
  openModal('batchDetailModal');
}

function editBatch(id) {
  const b=APP.batches.find(x=>x.id===id);
  if(!b) return;
  APP.currentBatchId=id;
  navigate('add-batch',{editing:true});
  document.getElementById('batchFormTitle').textContent='Edit Batch – '+b.batchNum;
  document.getElementById('fBatchNum').value=b.batchNum;
  document.getElementById('fOrderNum').value=b.orderNum;
  document.getElementById('fFabricType').value=b.fabricType||'';
  document.getElementById('fSupplier').value=b.supplier||'';
  document.getElementById('fColourName').value=b.colourName||'';
  document.getElementById('fDateReceived').value=b.dateReceived||'';
  document.getElementById('fNotes').value=b.notes||'';
  if(b.imageData){
    APP.uploadedImageData=b.imageData;
    document.getElementById('imgPreview').src=b.imageData;
    document.getElementById('imgPreviewWrap').style.display='';
    document.getElementById('uploadZone').style.display='none';
    document.getElementById('nextToSampleBtn').disabled=false;
  }
  if(b.colour) APP.sampledColour=b.colour;
  showBatchStep(1);
}

function confirmDeleteBatch(id) {
  const b=APP.batches.find(x=>x.id===id);
  if(!b) return;
  document.getElementById('confirmTitle').textContent='Delete Batch';
  document.getElementById('confirmBody').innerHTML=`<div class="confirm-dialog"><div class="icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg></div><h3>Delete "${esc(b.batchNum)}"?</h3><p>This action cannot be undone. All colour data will be permanently removed.</p></div>`;
  document.getElementById('confirmOkBtn').onclick=async()=>{
    await dbDelete('batches',id);
    APP.batches=APP.batches.filter(x=>x.id!==id);
    closeModal('confirmModal'); renderBatches(); populateBatchFilterOrders();
    showToast('Batch deleted','success');
  };
  openModal('confirmModal');
}

// ===== COMPARE PAGE =====
function renderComparePage(params={}) {
  populateRefBatchSelect();
  if(params.refId){
    document.getElementById('refBatchSelect').value=params.refId;
    onRefBatchChange();
  }
  document.getElementById('inspectorName').value=APP.settings.inspector||'';
  document.getElementById('compareDate').value=new Date().toISOString().split('T')[0];
  document.getElementById('compareResults').style.display='none';
  APP.compResults=null;
}

function populateRefBatchSelect() {
  const sel=document.getElementById('refBatchSelect');
  const batches=[...APP.batches].sort((a,b)=>a.batchNum.localeCompare(b.batchNum));
  sel.innerHTML='<option value="">Choose reference batch...</option>'+batches.map(b=>`<option value="${b.id}">${esc(b.batchNum)} (${esc(b.orderNum)})</option>`).join('');
}

function onRefBatchChange() {
  const refId=document.getElementById('refBatchSelect').value;
  const ref=APP.batches.find(b=>b.id===refId);
  const preview=document.getElementById('refBatchPreview');
  if(!ref){preview.innerHTML='';document.getElementById('testBatchList').innerHTML='<div style="text-align:center;padding:20px;color:var(--text3);font-size:13.5px">Select a reference batch first</div>';return;}
  preview.innerHTML=batchMiniCard(ref,true);
  const testBatches=APP.batches.filter(b=>b.orderNum===ref.orderNum&&b.id!==ref.id);
  const list=document.getElementById('testBatchList');
  if(!testBatches.length){list.innerHTML=`<div style="text-align:center;padding:20px;color:var(--text3);font-size:13.5px">No other batches in order ${esc(ref.orderNum)}</div>`;return;}
  list.innerHTML=testBatches.map(b=>`
    <div class="batch-select-item" id="ts_${b.id}" onclick="toggleTestBatch('${b.id}')">
      <input type="checkbox" id="cb_${b.id}" value="${b.id}" onclick="event.stopPropagation();toggleTestBatch('${b.id}')">
      ${b.imageData?`<img src="${b.imageData}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`:`<div style="width:40px;height:40px;border-radius:6px;background:${b.colour?.hex||'#ccc'};border:1px solid var(--border)"></div>`}
      <div style="flex:1"><div style="font-weight:600;font-size:13.5px">${esc(b.batchNum)}</div><div style="font-size:12px;color:var(--text2)">${esc(b.colourName||b.colour?.hex||'—')}</div></div>
      ${b.colour?`<div style="width:20px;height:20px;border-radius:4px;background:${b.colour.hex};border:1px solid var(--border)"></div>`:''}
    </div>`).join('');
}

function toggleTestBatch(id) {
  const cb=document.getElementById('cb_'+id);
  const item=document.getElementById('ts_'+id);
  if(!cb||!item) return;
  cb.checked=!cb.checked;
  item.classList.toggle('selected',cb.checked);
}

function batchMiniCard(b, isRef=false) {
  return `<div style="display:flex;align-items:center;gap:10px;padding:10px;background:var(--surface2);border-radius:var(--radius-sm);border:1px solid var(--border)">
    ${b.imageData?`<img src="${b.imageData}" style="width:48px;height:48px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`:`<div style="width:48px;height:48px;border-radius:6px;background:${b.colour?.hex||'#ccc'};border:1px solid var(--border)"></div>`}
    <div style="flex:1"><div style="font-weight:700;font-size:14px">${esc(b.batchNum)}</div><div style="font-size:12px;color:var(--text2)">${esc(b.orderNum)} · ${esc(b.colourName||'—')}</div>${b.colour?`<div style="font-size:11.5px;color:var(--text3)">${b.colour.hex.toUpperCase()}</div>`:''}</div>
    ${isRef?'<span class="badge badge-info">REF</span>':''}
  </div>`;
}

function runComparison() {
  const refId=document.getElementById('refBatchSelect').value;
  if(!refId){showToast('Please select a reference batch','error');return;}
  const ref=APP.batches.find(b=>b.id===refId);
  if(!ref||!ref.colour?.lab){showToast('Reference batch has no sampled colour. Please edit and re-sample.','error');return;}
  const checked=document.querySelectorAll('#testBatchList input[type=checkbox]:checked');
  if(!checked.length){showToast('Select at least one test batch','error');return;}
  const testIds=[...checked].map(cb=>cb.value);
  const testBatches=testIds.map(id=>APP.batches.find(b=>b.id===id)).filter(Boolean);
  const tolerance=parseFloat(document.getElementById('compareTolerance').value)||3.0;
  const results=testBatches.map(test=>{
    if(!test.colour?.lab) return {batch:test,de2000:null,de76:null,verdict:null,error:'No colour data — please re-sample'};
    const de2000=ColourSci.deltaE2000(ref.colour.lab,test.colour.lab);
    const de76=ColourSci.deltaE76(ref.colour.lab,test.colour.lab);
    const verdict=ColourSci.getVerdict(de2000);
    const description=ColourSci.describeDiff(ref.colour.lab,test.colour.lab);
    return {batch:test,de2000,de76,verdict,description};
  });
  APP.compResults={ref,results,tolerance};
  renderComparisonResults(APP.compResults);
  document.getElementById('compareResults').style.display='';
  document.getElementById('compareResults').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function renderComparisonResults({ref,results,tolerance}) {
  document.getElementById('comparisonCards').innerHTML=results.map(r=>comparisonCardHTML(ref,r,tolerance)).join('');
  const matrix=document.getElementById('matrixSection');
  if(results.length>=2){matrix.style.display='';renderMatrix(ref,results);}
  else matrix.style.display='none';
}

function comparisonCardHTML(ref, result, tolerance) {
  const {batch,de2000,de76,verdict,description,error}=result;
  if(error) return `<div class="card" style="margin-bottom:12px;border-color:var(--danger)"><div style="color:var(--danger);font-size:14px;font-weight:600">⚠ ${esc(batch.batchNum)}: ${esc(error)}</div></div>`;
  const pct=Math.min(99,de2000/10*100);
  const exceeded=de2000>tolerance;
  const dL=(batch.colour.lab.L-ref.colour.lab.L).toFixed(1);
  const da=(batch.colour.lab.a-ref.colour.lab.a).toFixed(1);
  const db=(batch.colour.lab.b-ref.colour.lab.b).toFixed(1);
  return `<div class="card fade-in" style="margin-bottom:16px${exceeded?';border-color:'+verdict.color+';border-width:2px':''}">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:16px">
      <div><div style="font-size:16px;font-weight:700">${esc(batch.batchNum)}</div><div style="font-size:13px;color:var(--text2)">${esc(batch.orderNum)}</div></div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${exceeded?'<span class="badge badge-danger">⚠ Exceeds Tolerance</span>':''}
        <span class="badge" style="background:${verdict.color}20;color:${verdict.textColor}">${verdict.label}</span>
      </div>
    </div>
    <div class="compare-grid" style="margin-bottom:16px">
      <div style="text-align:center">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Reference</div>
        ${ref.imageData?`<img src="${ref.imageData}" style="width:100%;height:100px;object-fit:cover;border-radius:var(--radius-sm);border:2px solid var(--border)">`:`<div style="height:100px;background:${ref.colour.hex};border-radius:var(--radius-sm);border:2px solid var(--border)"></div>`}
        <div style="margin-top:6px;font-size:12px;font-weight:600">${ref.colour.hex.toUpperCase()}</div>
        <div style="font-size:11px;color:var(--text2)">${esc(ref.batchNum)}</div>
      </div>
      <div class="compare-vs">VS</div>
      <div style="text-align:center">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Test</div>
        ${batch.imageData?`<img src="${batch.imageData}" style="width:100%;height:100px;object-fit:cover;border-radius:var(--radius-sm);border:2px solid var(--border)">`:`<div style="height:100px;background:${batch.colour.hex};border-radius:var(--radius-sm);border:2px solid var(--border)"></div>`}
        <div style="margin-top:6px;font-size:12px;font-weight:600">${batch.colour.hex.toUpperCase()}</div>
        <div style="font-size:11px;color:var(--text2)">${esc(batch.batchNum)}</div>
      </div>
    </div>
    <div class="de-gauge">
      <div style="text-align:center;margin-bottom:8px">
        <div class="de-value" style="color:${verdict.color}">${de2000.toFixed(2)}</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:8px">ΔE 2000 (primary)&nbsp;&nbsp;·&nbsp;&nbsp;ΔE 76: ${de76.toFixed(2)}</div>
        <span class="de-verdict" style="background:${verdict.color}20;color:${verdict.textColor}">${verdict.label}</span>
      </div>
      <div class="de-track" style="margin:14px 0 4px"><div class="de-thumb" style="left:${pct}%"></div></div>
      <div class="de-labels"><span>0</span><span>1.0</span><span>2.0</span><span>3.5</span><span>5.0</span><span>10+</span></div>
    </div>
    <div style="margin-top:12px">
      <div style="font-size:12px;font-weight:600;color:var(--text2);margin-bottom:8px">Lab Channel Differences (Δ)</div>
      ${diffBar('L*',dL,20)}${diffBar('a*',da,20)}${diffBar('b*',db,20)}
    </div>
    <div style="margin-top:10px;font-size:13px;color:var(--text2);padding:8px 12px;background:var(--surface2);border-radius:var(--radius-sm)">
      🔍 ${description}
    </div>
  </div>`;
}

function diffBar(label, val, maxVal) {
  const pct=Math.min(100,Math.abs(val)/maxVal*100);
  const color=Math.abs(val)<1?'#22c55e':Math.abs(val)<2?'#f59e0b':'#ef4444';
  const sign=val>0?'+':'';
  return `<div class="diff-row"><div class="diff-label">${label}</div><div class="diff-bar-wrap"><div class="diff-bar" style="width:${pct}%;background:${color}"></div></div><div class="diff-val">${sign}${parseFloat(val).toFixed(1)}</div></div>`;
}

function renderMatrix(ref, results) {
  const all=[{batch:ref,isRef:true},...results.map(r=>({batch:r.batch,isRef:false}))];
  const table=document.getElementById('matrixTable');
  const header='<tr><th></th>'+all.map(b=>`<th>${esc(b.batch.batchNum)}</th>`).join('')+'</tr>';
  const rows=all.map(rowB=>{
    const cells=all.map(colB=>{
      if(rowB.batch.id===colB.batch.id) return '<td style="background:var(--surface2)">—</td>';
      if(!rowB.batch.colour?.lab||!colB.batch.colour?.lab) return '<td style="color:var(--text3)">N/A</td>';
      const de=ColourSci.deltaE2000(rowB.batch.colour.lab,colB.batch.colour.lab);
      const v=ColourSci.getVerdict(de);
      return `<td><span class="matrix-cell" style="background:${v.color}20;color:${v.textColor}">${de.toFixed(2)}</span></td>`;
    }).join('');
    return `<tr><th style="text-align:left">${esc(rowB.batch.batchNum)}${rowB.isRef?' <span class="badge badge-info" style="font-size:10px;padding:1px 6px">REF</span>':''}</th>${cells}</tr>`;
  }).join('');
  table.innerHTML=header+rows;
}

async function saveComparison() {
  if(!APP.compResults){showToast('Run a comparison first','error');return;}
  const {ref,results,tolerance}=APP.compResults;
  const inspector=document.getElementById('inspectorName').value.trim();
  const remarks=document.getElementById('compareRemarks').value.trim();
  const date=document.getElementById('compareDate').value;
  const valid=results.filter(r=>r.de2000!==null);
  const maxDE=valid.length?Math.max(...valid.map(r=>r.de2000)):0;
  const comp={
    id:'C'+Date.now(),
    orderNum:ref.orderNum,
    refBatchId:ref.id,
    refBatchNum:ref.batchNum,
    testResults:results.map(r=>({batchId:r.batch.id,batchNum:r.batch.batchNum,de2000:r.de2000,de76:r.de76,verdict:r.verdict?.key,description:r.description})),
    maxDE,overallVerdict:ColourSci.getVerdict(maxDE).key,
    tolerance,inspector,remarks,date,createdAt:Date.now()
  };
  await dbPut('comparisons',comp);
  APP.comparisons.push(comp);
  showToast('Comparison report saved!','success');
  document.getElementById('compareRemarks').value='';
}

// ===== HISTORY PAGE =====
function renderHistoryPage() { renderHistory(); }

function renderHistory() {
  const search=(document.getElementById('historySearch')?.value||'').toLowerCase();
  const filterVerdict=document.getElementById('historyFilterVerdict')?.value||'';
  let comps=APP.comparisons.filter(c=>{
    if(filterVerdict&&c.overallVerdict!==filterVerdict) return false;
    if(search&&!c.orderNum.toLowerCase().includes(search)&&!c.refBatchNum.toLowerCase().includes(search)) return false;
    return true;
  }).sort((a,b)=>b.createdAt-a.createdAt);
  document.getElementById('historyCount').textContent=comps.length+' comparison report'+(comps.length!==1?'s':'');
  const tbody=document.getElementById('historyTableBody');
  if(!comps.length){
    tbody.innerHTML='<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text2)"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin:0 auto 10px;display:block;opacity:.4"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>No comparison reports found</td></tr>';
    return;
  }
  tbody.innerHTML=comps.map(c=>{
    const v=ColourSci.getVerdict(c.maxDE||0);
    const testNums=(c.testResults||[]).map(r=>r.batchNum).join(', ');
    return `<tr>
      <td style="white-space:nowrap">${esc(c.date||fmtDate(c.createdAt))}</td>
      <td>${esc(c.orderNum)}</td>
      <td style="font-weight:600">${esc(c.refBatchNum)}</td>
      <td style="font-size:12px;color:var(--text2);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(testNums)}</td>
      <td style="font-weight:700;color:${v.textColor}">${(c.maxDE||0).toFixed(2)}</td>
      <td><span class="badge ${v.cls}">${v.label}</span></td>
      <td>${esc(c.inspector||'—')}</td>
      <td><div class="td-actions"><button class="btn btn-outline btn-sm" onclick="viewReport('${c.id}')">View</button><button class="btn btn-ghost btn-sm" style="color:var(--danger)" onclick="confirmDeleteReport('${c.id}')">Delete</button></div></td>
    </tr>`;
  }).join('');
}

function viewReport(id) {
  const c=APP.comparisons.find(x=>x.id===id);
  if(!c) return;
  const ref=APP.batches.find(b=>b.id===c.refBatchId);
  const v=ColourSci.getVerdict(c.maxDE||0);
  document.getElementById('reportBody').innerHTML=`
    <div class="report-header">
      <h2>Shade Comparison Report</h2>
      <p>Shade Match QC System — ${new Date(c.createdAt).toLocaleString()}</p>
      <div class="report-meta">
        <div class="report-meta-item"><span>Order Number</span>${esc(c.orderNum)}</div>
        <div class="report-meta-item"><span>Date</span>${esc(c.date||fmtDate(c.createdAt))}</div>
        <div class="report-meta-item"><span>Inspector</span>${esc(c.inspector||'—')}</div>
        <div class="report-meta-item"><span>Tolerance</span>ΔE ${c.tolerance}</div>
        <div class="report-meta-item"><span>Overall Result</span><strong style="color:${v.color}">${v.label}</strong></div>
        <div class="report-meta-item"><span>Max ΔE 2000</span><strong>${(c.maxDE||0).toFixed(2)}</strong></div>
      </div>
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Reference Batch</div>
      ${ref?batchMiniCard(ref,true):`<div style="color:var(--text2)">${esc(c.refBatchNum)} (data not available)</div>`}
    </div>
    <div class="card" style="margin-bottom:16px">
      <div class="card-title">Test Batch Results</div>
      ${(c.testResults||[]).map(r=>{
        const test=APP.batches.find(b=>b.id===r.batchId);
        const rv=r.de2000!==null?ColourSci.getVerdict(r.de2000):{label:'N/A',cls:'badge-info',color:'#ccc',textColor:'#666'};
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">
          ${test?.imageData?`<img src="${test.imageData}" style="width:50px;height:50px;object-fit:cover;border-radius:6px;border:1px solid var(--border)">`:(test?.colour?`<div style="width:50px;height:50px;border-radius:6px;background:${test.colour.hex};border:1px solid var(--border)"></div>`:'')}
          <div style="flex:1"><div style="font-weight:700">${esc(r.batchNum)}</div><div style="font-size:12px;color:var(--text2)">${esc(r.description||'')}</div></div>
          <div style="text-align:right"><div style="font-size:22px;font-weight:800;color:${rv.textColor}">${r.de2000!==null?r.de2000.toFixed(2):'—'}</div><div style="font-size:11px;color:var(--text3)">ΔE 2000</div></div>
          <span class="badge ${rv.cls}">${rv.label}</span>
        </div>`;}).join('')}
    </div>
    ${c.remarks?`<div class="card"><div class="card-title">Inspector Remarks</div><p style="font-size:14px;color:var(--text2)">${esc(c.remarks)}</p></div>`:''}`;
  openModal('reportModal');
}

function confirmDeleteReport(id) {
  document.getElementById('confirmTitle').textContent='Delete Report';
  document.getElementById('confirmBody').innerHTML='<div class="confirm-dialog"><div class="icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></div><h3>Delete this report?</h3><p>This comparison report will be permanently deleted.</p></div>';
  document.getElementById('confirmOkBtn').onclick=async()=>{
    await dbDelete('comparisons',id);
    APP.comparisons=APP.comparisons.filter(x=>x.id!==id);
    closeModal('confirmModal'); renderHistory();
    showToast('Report deleted','success');
  };
  openModal('confirmModal');
}

// ===== DATA MANAGEMENT =====
function exportAllData() {
  const data={batches:APP.batches,comparisons:APP.comparisons,settings:APP.settings,exportedAt:new Date().toISOString(),appVersion:'1.0'};
  dlJSON(data,'shade-match-backup-'+new Date().toISOString().split('T')[0]+'.json');
  showToast('Data exported','success');
}

function importData(event) {
  const file=event.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=async e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.batches||!Array.isArray(data.batches)) throw new Error('Invalid file: missing batches array');
      document.getElementById('confirmTitle').textContent='Import Data';
      document.getElementById('confirmBody').innerHTML=`<div class="confirm-dialog"><div class="icon" style="background:#dbeafe"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg></div><h3>Import ${data.batches.length} batches?</h3><p>This will merge with existing data. Records with matching IDs will be overwritten.</p></div>`;
      const btn=document.getElementById('confirmOkBtn');
      btn.textContent='Import'; btn.className='btn btn-primary';
      btn.onclick=async()=>{
        for(const b of data.batches) await dbPut('batches',b);
        for(const c of (data.comparisons||[])) await dbPut('comparisons',c);
        await loadAllData(); closeModal('confirmModal');
        renderDashboard();
        showToast('Imported '+data.batches.length+' batches','success');
        btn.textContent='Confirm'; btn.className='btn btn-danger';
      };
      openModal('confirmModal');
    }catch(err){showToast('Invalid JSON: '+err.message,'error');}
    event.target.value='';
  };
  reader.readAsText(file);
}

function exportHistoryCSV() {
  if(!APP.comparisons.length){showToast('No comparison history to export','warning');return;}
  const headers=['Date','Order Number','Reference Batch','Test Batches','Max ΔE','ΔE Verdict','Inspector','Remarks'];
  const rows=APP.comparisons.map(c=>{
    const v=ColourSci.getVerdict(c.maxDE||0);
    return [c.date||fmtDate(c.createdAt),c.orderNum,c.refBatchNum,(c.testResults||[]).map(r=>r.batchNum).join('; '),(c.maxDE||0).toFixed(2),v.label,c.inspector||'',c.remarks||''].map(csvE).join(',');
  });
  dlText([headers.join(','),...rows].join('\n'),'shade-match-history-'+new Date().toISOString().split('T')[0]+'.csv','text/csv');
  showToast('CSV exported','success');
}

function confirmClearData() {
  document.getElementById('confirmTitle').textContent='Clear All Data';
  document.getElementById('confirmBody').innerHTML='<div class="confirm-dialog"><div class="icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>Delete ALL data?</h3><p>All batches, comparisons and settings will be permanently deleted.</p></div>';
  document.getElementById('confirmOkBtn').onclick=()=>{
    document.getElementById('confirmTitle').textContent='Final Confirmation';
    document.getElementById('confirmBody').innerHTML='<div class="confirm-dialog"><div class="icon"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><h3>Are you absolutely sure?</h3><p>Click Confirm to permanently delete ALL application data. This cannot be undone.</p></div>';
    document.getElementById('confirmOkBtn').onclick=async()=>{
      await dbClear('batches'); await dbClear('comparisons');
      localStorage.removeItem('sm_batches'); localStorage.removeItem('sm_comparisons');
      APP.batches=[]; APP.comparisons=[];
      closeModal('confirmModal'); navigate('dashboard');
      showToast('All data cleared','success');
    };
  };
  openModal('confirmModal');
}

// ===== DEMO DATA =====
async function loadDemoData() {
  const orderNum='ORD-DEMO-'+new Date().getFullYear();
  const demos=[
    {id:'B_D1',batchNum:'BT-DEMO-001',colourName:'Navy Blue (Standard)',r:20,g:40,b:100,supplier:'Coats Bangladesh',fabric:'Cotton (100%)'},
    {id:'B_D2',batchNum:'BT-DEMO-002',colourName:'Navy Blue (Batch 2)',r:24,g:44,b:108,supplier:'DBL Fabrics',fabric:'Cotton (100%)'},
    {id:'B_D3',batchNum:'BT-DEMO-003',colourName:'Navy Blue (Batch 3)',r:17,g:36,b:94,supplier:'Hamid Fabrics',fabric:'Cotton/Polyester Blend'},
    {id:'B_D4',batchNum:'BT-DEMO-004',colourName:'Navy Blue (Batch 4)',r:30,g:50,b:116,supplier:'Square Textiles',fabric:'Interlock Knit'},
    {id:'B_D5',batchNum:'BT-DEMO-005',colourName:'Navy Blue (Off-shade)',r:34,g:52,b:88,supplier:'Aman Cotton',fabric:'Jersey Knit'},
  ];
  let added=0;
  for(let i=0;i<demos.length;i++){
    const d=demos[i];
    if(APP.batches.find(b=>b.batchNum===d.batchNum)){continue;}
    const lab=ColourSci.rgbToLab(d.r,d.g,d.b);
    const hex=ColourSci.rgbToHex(d.r,d.g,d.b);
    const hsl=ColourSci.rgbToHSL(d.r,d.g,d.b);
    const cv=document.createElement('canvas'); cv.width=200; cv.height=150;
    const ctx=cv.getContext('2d');
    ctx.fillStyle=hex; ctx.fillRect(0,0,200,150);
    // simulate fabric texture
    for(let n=0;n<3000;n++){
      const nr=Math.min(255,Math.max(0,d.r+(Math.random()-0.5)*25));
      const ng=Math.min(255,Math.max(0,d.g+(Math.random()-0.5)*25));
      const nb=Math.min(255,Math.max(0,d.b+(Math.random()-0.5)*25));
      ctx.fillStyle=`rgba(${nr|0},${ng|0},${nb|0},0.6)`;
      ctx.fillRect(Math.random()*200,Math.random()*150,Math.random()*4+1,Math.random()*2+1);
    }
    const batch={
      id:d.id,batchNum:d.batchNum,orderNum,
      fabricType:d.fabric,supplier:d.supplier,colourName:d.colourName,
      dateReceived:new Date(Date.now()-(5-i)*86400000).toISOString().split('T')[0],
      notes:'Demo batch — Roll No: '+(100+i)+', Dye Lot: DL-'+String(2024+i),
      imageData:cv.toDataURL('image/jpeg',0.8),
      colour:{r:d.r,g:d.g,b:d.b,hex,hsl,lab},
      createdAt:Date.now()-(5-i)*3600000,updatedAt:Date.now()
    };
    await dbPut('batches',batch);
    APP.batches.push(batch);
    added++;
  }
  if(added>0) showToast(`Loaded ${added} demo batches for order ${orderNum}`,'success');
  else showToast('Demo data already loaded','info');
  renderDashboard();
  navigate('batches');
}

// ===== MODALS =====
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// ===== TOAST =====
function showToast(msg, type='info') {
  const c=document.getElementById('toastContainer');
  const icons={
    success:'<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    error:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    warning:'<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    info:'<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
  };
  const t=document.createElement('div');
  t.className='toast toast-'+type;
  t.innerHTML=`<div class="toast-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${icons[type]||icons.info}</svg></div><div class="toast-msg">${esc(msg)}</div><div class="toast-close" onclick="rmToast(this.parentElement)"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>`;
  c.appendChild(t);
  setTimeout(()=>rmToast(t),4000);
}
function rmToast(t) { if(!t||!t.parentElement) return; t.classList.add('removing'); setTimeout(()=>t.remove(),250); }

// ===== UTILS =====
function esc(str) { if(!str) return ''; return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function fmtDate(ts) { if(!ts) return '—'; return new Date(ts).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
function dlJSON(data, fn) { dlBlob(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),fn); }
function dlText(text, fn, type='text/plain') { dlBlob(new Blob([text],{type}),fn); }
function dlBlob(blob, fn) { const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fn;a.click();setTimeout(()=>URL.revokeObjectURL(url),500); }
function csvE(str) { str=String(str||''); if(str.includes(',')||str.includes('"')||str.includes('\n')) return '"'+str.replace(/"/g,'""')+'"'; return str; }
function ir(label, value) { return `<div><div style="font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px">${label}</div><div style="font-size:14px;font-weight:500;color:var(--text)">${esc(String(value))}</div></div>`; }

// ===== SIDEBAR TOGGLE =====
function initSidebar() {
  const toggle=document.getElementById('sidebarToggle');
  const sidebar=document.getElementById('sidebar');
  const icon=document.getElementById('sidebarToggleIcon');
  let collapsed=localStorage.getItem('sm_sidebar')==='1';
  if(collapsed){sidebar.classList.add('collapsed');icon.innerHTML='<path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>';}
  toggle.addEventListener('click',()=>{
    collapsed=!collapsed;
    sidebar.classList.toggle('collapsed',collapsed);
    icon.innerHTML=collapsed?'<path d="M13 17l5-5-5-5M6 17l5-5-5-5"/>':'<path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/>';
    localStorage.setItem('sm_sidebar',collapsed?'1':'0');
  });
}

// ===== DRAG AND DROP =====
function initDragDrop() {
  const zone=document.getElementById('uploadZone');
  if(!zone) return;
  zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
  zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
  zone.addEventListener('drop',e=>{
    e.preventDefault(); zone.classList.remove('dragover');
    const file=e.dataTransfer.files[0];
    if(file&&file.type.startsWith('image/')){const reader=new FileReader();reader.onload=ev=>processImageData(ev.target.result,file.name);reader.readAsDataURL(file);}
    else showToast('Please drop a valid image file','error');
  });
}

// ===== INIT =====
async function init() {
  await initDB();
  await loadAllData();
  loadSettings();
  initSidebar();
  document.querySelectorAll('[data-page]').forEach(el=>{
    el.addEventListener('click',()=>navigate(el.dataset.page));
  });
  document.getElementById('themeToggle').addEventListener('click',()=>{
    const dark=document.documentElement.getAttribute('data-theme')==='dark';
    applyTheme(!dark);
    APP.settings.darkMode=!dark;
    document.getElementById('settingsDark').checked=!dark;
    localStorage.setItem('sm_settings',JSON.stringify(APP.settings));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay=>{
    overlay.addEventListener('click',e=>{if(e.target===overlay)closeModal(overlay.id);});
  });
  window.addEventListener('hashchange',()=>{
    const h=window.location.hash.replace('#','')||'dashboard';
    const valid=['dashboard','add-batch','batches','compare','history','settings'];
    if(valid.includes(h)) navigate(h);
  });
  document.getElementById('fDateReceived').value=new Date().toISOString().split('T')[0];
  document.getElementById('compareDate').value=new Date().toISOString().split('T')[0];
  initDragDrop();
  const h=window.location.hash.replace('#','')||'dashboard';
  navigate(['dashboard','add-batch','batches','compare','history','settings'].includes(h)?h:'dashboard');
}

document.addEventListener('DOMContentLoaded',init);
