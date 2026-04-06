
// 5x3 Slot machine script with simple paylines and a mini-game
const symbols = ["🍒","🍋","🍊","⭐","7️⃣","💎","🍇"];
let coins = 10;
let bet = 1;
const basePayout = {"🍒":2, "🍋":3, "🍊":4, "⭐":6, "7️⃣":12, "💎":25, "🍇":5};
const multipliers = {3:1,4:3,5:10};

const ROWS = 3, COLS = 5;
let spinning = false;
let advancedMode = true; // always use advanced paylines and vertical wins

const $ = s => document.querySelector(s);

function updateUI(){
  $("#coins").textContent = coins;
  if($('#bet')) $('#bet').textContent = bet;
  // show/hide mini-game
  const mg = $("#minigame");
  if(mg) mg.classList.toggle('hidden', coins > 0);
  const spinBtn = $('#spinBtn');
  if(spinBtn) spinBtn.disabled = (coins < bet) || spinning;
}

function setMessage(txt){ $("#message").textContent = txt; }

function randSym(){ return symbols[Math.floor(Math.random()*symbols.length)]; }

function getCell(col, row){ return document.querySelector(`.col[data-col="${col}"] .cell[data-row="${row}"]`); }

function spin(){
  if(spinning) return;
  if(coins < bet){ setMessage('Not enough coins — play the mini-game to win coins.'); updateUI(); return; }
  spinning = true;
  coins -= bet; updateUI(); setMessage('Spinning...');

  // intervals per column; each column cycles its three cells
  const intervals = [];
  const finalMatrix = Array.from({length:ROWS}, ()=>Array(COLS).fill(null));

  for(let c=0;c<COLS;c++){
    const colEl = document.querySelector(`.col[data-col="${c}"]`);
    if(!colEl) continue;
    const cells = Array.from(colEl.querySelectorAll('.cell'));
    cells.forEach(cell=>cell.classList.add('spinning'));

    intervals[c] = setInterval(()=>{
      cells.forEach(cell=>{ cell.textContent = randSym(); });
    }, 60 + c*20);
  }

  // stop columns left-to-right with increasing delay
  const stopBase = 900;
  for(let c=0;c<COLS;c++){
    setTimeout(()=>{
      clearInterval(intervals[c]);
      // set final symbols for this column
      for(let r=0;r<ROWS;r++){
        const sym = randSym();
        finalMatrix[r][c] = sym;
        const cell = getCell(c,r);
        if(cell){ cell.textContent = sym; cell.classList.remove('spinning'); }
      }

      // if last column stopped, evaluate and re-enable the spin button afterward
      if(c === COLS-1){
        setTimeout(()=>{ spinning = false; evaluate(finalMatrix); }, 120);
      }
    }, stopBase + c*400);
  }
}

let showWinningLines = true;

function clearHighlights(){
  document.querySelectorAll('.cell.highlight').forEach(c=>c.classList.remove('highlight'));
}

// Advanced PAYLINES set (used when advancedMode=true)
const ADV_PAYLINES = [
  [1,1,1,1,1],
  [0,0,0,0,0],
  [2,2,2,2,2],
  [0,1,2,1,0],
  [2,1,0,1,2],
  [0,0,1,0,0],
  [2,2,1,2,2],
  [0,1,1,1,2],
  [2,1,1,1,0],
  [1,0,1,2,1],
  [0,2,0,2,0],
  [2,0,2,0,2]
];

// Audio helper
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function playTone(freq=440, time=0.07, type='sine', volume=0.12){
  try{
    if(!audioCtx) audioCtx = new AudioCtx();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g); g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + time);
    setTimeout(()=>{ o.stop(); }, time*1000+50);
  }catch(e){/* ignore */}
}

function playClick(){ playTone(900,0.06,'square',0.08); }
function playSpin(){ playTone(220,0.12,'sawtooth',0.06); }
function playWin(){ playTone(880,0.2,'sine',0.12); setTimeout(()=>playTone(1320,0.12,'sine',0.1),120); }
function playCoin(){ playTone(1200,0.08,'triangle',0.08); }

// Confetti effect
function burstConfetti(){
  const colors = ['#ff4d4d','#ffd24d','#7cff7c','#7cd4ff','#c77cff'];
  for(let i=0;i<30;i++){
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.background = colors[i%colors.length];
    el.style.left = (50 + (Math.random()*60-30)) + '%';
    el.style.top = (30 + Math.random()*20) + '%';
    document.body.appendChild(el);
    const dx = (Math.random()*2-1)*200;
    const dy = 400 + Math.random()*200;
    el.animate([{transform:`translate(0,0) rotate(${Math.random()*360}deg)`, opacity:1}, {transform:`translate(${dx}px,${dy}px) rotate(${Math.random()*720}deg)`, opacity:0}], {duration:1200+Math.random()*800, easing:'cubic-bezier(.2,.6,.2,1)'});
    setTimeout(()=>el.remove(), 2200);
  }
}

function maybeSurprise(totalWin){
  if(Math.random() > 0.14) return 0;
  const bonus = 2 + Math.floor(Math.random()*5) + bet;
  coins += bonus;
  playTone(1600,0.16,'triangle',0.13);
  burstConfetti();
  return bonus;
}

function evaluate(matrix){
  clearHighlights();
  let totalWin = 0;
  const details = [];

  // Always check horizontal row wins
  for(let r=0;r<ROWS;r++){
    let runSym = matrix[r][0];
    let runStart = 0;
    for(let c=1;c<=COLS;c++){
      const cur = (c< COLS) ? matrix[r][c] : null;
      if(cur === runSym){
        // continue
      } else {
        const runLen = c - runStart;
        if(runSym && runLen >= 3){
          const payout = (basePayout[runSym] || 3) * (multipliers[runLen] || 1) * bet;
          totalWin += payout;
          details.push({type:'row', row:r, start:runStart, len:runLen, sym:runSym, payout});
          if(showWinningLines){
            for(let cc=runStart; cc<runStart+runLen; cc++){
              const cell = getCell(cc,r);
              if(cell) cell.classList.add('highlight');
            }
          }
        }
        runSym = cur;
        runStart = c;
      }
    }
  }

  // Always check vertical column wins
  for(let c=0;c<COLS;c++){
    let runSym = matrix[0][c];
    let runStart = 0;
    for(let r=1;r<=ROWS;r++){
      const cur = (r< ROWS) ? matrix[r][c] : null;
      if(cur === runSym){
        // continue
      } else {
        const runLen = r - runStart;
        if(runSym && runLen >= 3){
          const payout = (basePayout[runSym] || 3) * (multipliers[runLen] || 1) * bet;
          totalWin += payout;
          details.push({type:'col', col:c, start:runStart, len:runLen, sym:runSym, payout});
          if(showWinningLines){
            for(let rr=runStart; rr<runStart+runLen; rr++){
              const cell = getCell(c,rr);
              if(cell) cell.classList.add('highlight');
            }
          }
        }
        runSym = cur;
        runStart = r;
      }
    }
  }

  // Always count advanced paylines on top
  ADV_PAYLINES.forEach((pattern, idx)=>{
    const arr = pattern.map((rowIdx, colIdx)=> matrix[rowIdx][colIdx]);
    const first = arr[0];
    if(!first) return;
    let count = 1;
    for(let i=1;i<arr.length;i++){
      if(arr[i] === first) count++; else break;
    }
    if(count >= 3){
      const payout = (basePayout[first] || 3) * (multipliers[count] || 1) * bet;
      totalWin += payout;
      details.push({type:'pattern', patternIdx:idx, pattern, count, sym:first, payout});
      if(showWinningLines){
        for(let cc=0; cc<count; cc++){
          const rowIdx = pattern[cc];
          const cell = getCell(cc,rowIdx);
          if(cell) cell.classList.add('highlight');
        }
      }
    }
  });

  let msg = '';
  if(totalWin > 0){
    coins += totalWin;
    msg = `You won ${totalWin} coins!`;
    playWin();
    burstConfetti();
    setTimeout(()=>playCoin(),200);
  }

  const surprise = maybeSurprise(totalWin);
  if(surprise > 0){
    msg = msg ? `${msg} + Surprise bonus ${surprise}!` : `Surprise! You earned ${surprise} extra coins!`;
  }

  if(!msg) msg = 'No winning paylines.';
  setMessage(msg);
  updateUI();
}

// mini-game: 3 chests, one random contains coins
function setupMiniGame(){
  // legacy chest mini-game (kept hidden) wiring
  const mg = $('#minigame');
  if(mg){
    const chests = mg.querySelectorAll('.chest');
    chests.forEach(btn=> btn.addEventListener('click', onChest));
    $('#closeMini').addEventListener('click', ()=>{ mg.classList.add('hidden'); setMessage('Closed mini-game.'); });
  }
  // Left sidebar Wash Dishes game
  const openBtn = $('#openMini');
  const panel = $('#miniGamePanel');
  const startBtn = $('#startMini');
  const closePanel = $('#closeMiniPanel');
  if(openBtn && panel){
    // open only so it doesn't accidentally close
    openBtn.addEventListener('click', ()=>{ panel.classList.remove('hidden'); });
  }
  if(closePanel && panel){
    // prevent closing while a game is running
    closePanel.addEventListener('click', ()=>{ if(!miniRunning) panel.classList.add('hidden'); });
  }
  if(startBtn) startBtn.addEventListener('click', startWashGame);
}

function onChest(e){
  const chosen = Number(e.currentTarget.dataset.id);
  const winner = Math.floor(Math.random()*3);
  const mg = $('#minigame');
  if(chosen === winner){
    const reward = 3;
    coins += reward; updateUI(); setMessage(`Nice! You found ${reward} coins.`);
  } else {
    setMessage('No luck — try again later.');
  }
  if(mg) mg.classList.add('hidden');
}

// --- Wash Dishes mini-game ---
let miniTimerId = null;
let miniDirtyInterval = null;
let miniTime = 12; // seconds
let platesCount = 12;
let washed = 0;
let miniRunning = false;

function startWashGame(){
  const panel = $('#miniGamePanel');
  if(!panel || miniRunning) return;
  miniRunning = true;
  washed = 0;
  $('#washedCount').textContent = washed;
  $('#miniTimer').textContent = miniTime;
  const platesEl = $('#plates');
  platesEl.innerHTML = '';
  for(let i=0;i<platesCount;i++){
    const b = document.createElement('button');
    b.className = 'plate';
    b.textContent = '🍽️';
    b.dataset.i = i;
    b.addEventListener('click', ()=>washPlate(b));
    platesEl.appendChild(b);
  }
  // start countdown
  let t = miniTime;
  $('#startMini').disabled = true;
  $('#openMini').disabled = true;
  $('#closeMiniPanel').disabled = true;
  miniTimerId = setInterval(()=>{
    t--;
    $('#miniTimer').textContent = t;
    if(t<=0){ endWashGame(); }
  },1000);

  // periodically mark random plates dirty
  miniDirtyInterval = setInterval(()=>{
    const plates = Array.from(document.querySelectorAll('#plates .plate'));
    const candidates = plates.filter(p=> !p.classList.contains('washed') && !p.classList.contains('dirty'));
    if(candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random()*candidates.length)];
    pick.classList.add('dirty');
  }, 700);

  setMessage('Wash dishes: click dirty plates to clean them!');
}

function washPlate(btn){
  if(!btn || btn.classList.contains('washed')) return;
  if(!btn.classList.contains('dirty')) return; // only clean dirty plates
  btn.classList.remove('dirty');
  btn.classList.add('washed');
  washed++;
  $('#washedCount').textContent = washed;
}

function endWashGame(){
  if(miniTimerId) clearInterval(miniTimerId);
  miniTimerId = null;
  if(miniDirtyInterval) clearInterval(miniDirtyInterval);
  miniDirtyInterval = null;
  miniRunning = false;
  // reward: 1 coin per plate washed, bonus 2 coins if > half
  const reward = washed + (washed >= Math.ceil(platesCount/2) ? 2 : 0);
  coins += reward;
  updateUI();
  setMessage(`Minigame over — you washed ${washed} plates and earned ${reward} coins.`);
  // leave panel open so user can start again; re-enable controls
  $('#startMini').disabled = false;
  $('#openMini').disabled = false;
  $('#closeMiniPanel').disabled = false;
  $('#miniTimer').textContent = 0;
  $('#washedCount').textContent = 0;
}

// --- Paytable generation ---
function buildPaytable(){
  const tbody = document.querySelector('#payTableGrid tbody');
  if(!tbody) return;
  tbody.innerHTML = '';
  const syms = Object.keys(basePayout);
  syms.forEach(sym=>{
    const tr = document.createElement('tr');
    const tdSym = document.createElement('td'); tdSym.textContent = sym;
    const p3 = (basePayout[sym] * multipliers[3] * bet) || 0;
    const p4 = (basePayout[sym] * multipliers[4] * bet) || 0;
    const p5 = (basePayout[sym] * multipliers[5] * bet) || 0;
    const p3v = p3;
    const p4v = p4;
    const p5v = p5;
    const td3 = document.createElement('td'); td3.textContent = p3;
    const td4 = document.createElement('td'); td4.textContent = p4;
    const td5 = document.createElement('td'); td5.textContent = p5;
    const td3v = document.createElement('td'); td3v.textContent = p3v;
    const td4v = document.createElement('td'); td4v.textContent = p4v;
    const td5v = document.createElement('td'); td5v.textContent = p5v;
    tr.appendChild(tdSym);
    tr.appendChild(td3);
    tr.appendChild(td4);
    tr.appendChild(td5);
    tr.appendChild(td3v);
    tr.appendChild(td4v);
    tr.appendChild(td5v);
    tbody.appendChild(tr);
  });

  const lineInfo = document.querySelector('#lineInfo');
  const payRules = document.querySelector('#payRules');
  if(lineInfo) lineInfo.textContent = 'All line types active';
  if(payRules){
    payRules.textContent = 'All wins count: horizontal rows, vertical columns, and extra advanced paylines.';
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  // restore persistent bet before UI updates
  try{
    const savedBet = localStorage.getItem('slotBet');
    if(savedBet) bet = Math.max(1, Number(savedBet));
  }catch(e){ }

  updateUI(); setMessage('Ready — press Spin to play!');
  $('#spinBtn').addEventListener('click', spin);
  setupMiniGame();
  // show lines checkbox
  const cb = $('#showLines');
  if(cb){
    showWinningLines = cb.checked;
    cb.addEventListener('change', ()=>{
      showWinningLines = cb.checked;
      if(!showWinningLines) clearHighlights();
    });
  }
  // bet controls
  const up = $('#betUp');
  const down = $('#betDown');
  if(up){ up.addEventListener('click', ()=>{ bet = Math.max(1, bet+1); updateUI(); buildPaytable(); try{ localStorage.setItem('slotBet', bet); }catch(e){} }); }
  if(down){ down.addEventListener('click', ()=>{ bet = Math.max(1, bet-1); updateUI(); buildPaytable(); try{ localStorage.setItem('slotBet', bet); }catch(e){} }); }
  // build initial paytable and UI
  buildPaytable();
  updateUI();
});

