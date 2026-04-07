
// 5x3 Slot machine script with simple paylines and a mini-game
const symbols = ["🍒","🍋","🍊","⭐","7️⃣","💎","🍇"];
let coins = 10;
let bet = 1;
const basePayout = {"🍒":2, "🍋":3, "🍊":4, "⭐":6, "7️⃣":12, "💎":25, "🍇":5};
const multipliers = {3:1,4:3,5:10};

const ROWS = 3, COLS = 5;
let spinning = false;
let advancedMode = true; // always use advanced paylines and vertical wins
let gameMode = 'slots';
let deck = [];
let dealerCards = [];
let playerCards = [];
let currentView = 'menu'; // menu, slots, blackjack, roulette, shop
let gamesPlayed = parseInt(localStorage.getItem('gamesPlayed') || '0');
let wins = parseInt(localStorage.getItem('wins') || '0');
let playerName = localStorage.getItem('playerName');
if(!playerName){
  playerName = prompt('Enter your name for the leaderboard:');
  if(playerName) localStorage.setItem('playerName', playerName);
  else playerName = 'Anonymous';
}

const $ = s => document.querySelector(s);
const defaultTheme = { bg: '#0f0f15', panel: '#171723', accent: '#57d01f' };

function updateUI(){
  $("#coins").textContent = coins;
  const shopCoins = $('#shopCoins');
  if(shopCoins) shopCoins.textContent = coins;
  if($('#bet')) $('#bet').textContent = bet;
  // show/hide mini-game
  const mg = $("#minigame");
  if(mg) mg.classList.toggle('hidden', coins > 0);
  const spinBtn = $('#spinBtn');
  if(spinBtn) spinBtn.disabled = (coins < bet) || spinning;
}

function setMessage(txt){ $("#message").textContent = txt; }

function switchView(view){
  currentView = view;
  const menu = $('#mainMenu');
  const game = $('#gameContainer');
  const shop = $('#shopPanel');
  const profile = $('#profilePanel');
  const leaderboard = $('#leaderboardPanel');
  const paytable = $('#paytable');
  if(menu) menu.classList.toggle('hidden', view !== 'menu');
  if(game) game.classList.toggle('hidden', view === 'menu' || view === 'shop' || view === 'profile' || view === 'leaderboard');
  if(shop) shop.classList.toggle('hidden', view !== 'shop');
  if(profile) profile.classList.toggle('hidden', view !== 'profile');
  if(leaderboard) leaderboard.classList.toggle('hidden', view !== 'leaderboard');
  if(paytable) paytable.classList.add('hidden');
  if(view === 'slots'){
    toggleMode('slots');
  } else if(view === 'shop'){
    // show shop overlay
  } else if(view === 'profile'){
    showProfile();
  } else if(view === 'leaderboard'){
    showLeaderboard();
  }
}

function showPopup(text, type='neutral'){
  const popup = document.createElement('div');
  popup.className = `outcome-popup ${type}`;
  popup.textContent = text;
  document.body.appendChild(popup);
  requestAnimationFrame(()=> popup.classList.add('visible'));
  setTimeout(()=>{
    popup.classList.remove('visible');
    setTimeout(()=> popup.remove(), 350);
  }, 1400);
}

function randSym(){ return symbols[Math.floor(Math.random()*symbols.length)]; }

function getCell(col, row){ return document.querySelector(`.col[data-col="${col}"] .cell[data-row="${row}"]`); }

function createDeck(){
  const suits = ['♠','♥','♦','♣'];
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const d = [];
  suits.forEach(suit=> ranks.forEach(rank=> d.push(`${rank}${suit}`)));
  return shuffle(d);
}

function shuffle(array){
  for(let i=array.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function drawCard(){
  if(deck.length === 0) deck = createDeck();
  return deck.pop();
}

function cardValue(card){
  const rank = card.slice(0, -1);
  if(rank === 'A') return 11;
  if(['K','Q','J'].includes(rank)) return 10;
  return Number(rank);
}

function handValue(cards){
  let sum = 0;
  let aces = 0;
  for(let card of cards){
    if(card.value === 'A'){
      aces++;
      sum += 11;
    } else if(['J','Q','K'].includes(card.value)){
      sum += 10;
    } else {
      sum += parseInt(card.value);
    }
  }
  while(sum > 21 && aces > 0){
    sum -= 10;
    aces--;
  }
  return sum;
}

function createCardElement(card){
  const cardEl = document.createElement('div');
  cardEl.className = 'card deal';
  const rank = card.slice(0, -1);
  const suit = card.slice(-1);
  const top = document.createElement('div'); top.className = 'card-corner top'; top.textContent = `${rank}${suit}`;
  const center = document.createElement('div'); center.className = 'card-center'; center.textContent = suit;
  const bottom = document.createElement('div'); bottom.className = 'card-corner bottom'; bottom.textContent = `${rank}${suit}`;
  cardEl.appendChild(top);
  cardEl.appendChild(center);
  cardEl.appendChild(bottom);
  if(['♥','♦'].includes(suit)) cardEl.classList.add('red');
  setTimeout(()=> cardEl.classList.remove('deal'), 500);
  return cardEl;
}

function updateBlackjackDisplay(){
  const dealer = $('#dealerHand');
  const player = $('#playerHand');
  if(dealer){
    dealer.innerHTML = '';
    dealerCards.forEach(card=> dealer.appendChild(createCardElement(card)));
  }
  if(player){
    player.innerHTML = '';
    playerCards.forEach(card=> player.appendChild(createCardElement(card)));
  }
}

function setBJMessage(txt){
  const msg = $('#bjMessage');
  if(msg) msg.textContent = txt;
}

function toggleMode(mode){
  gameMode = mode;
  const slotSection = document.querySelector('.slot');
  const bottomSpin = document.querySelector('.bottom-spin');
  const blackjackPanel = $('#blackjackPanel');
  const roulettePanel = $('#roulettePanel');
  const modeBtn = $('#modeBtn');
  const paytable = $('#paytable');
  if(mode === 'blackjack'){
    if(slotSection) slotSection.classList.add('hidden');
    if(bottomSpin) bottomSpin.classList.add('hidden');
    if(blackjackPanel) blackjackPanel.classList.remove('hidden');
    if(roulettePanel) roulettePanel.classList.add('hidden');
    if(crapsPanel) crapsPanel.classList.add('hidden');
    if(paytable) paytable.classList.add('hidden');
    if(modeBtn){ modeBtn.textContent = 'Back to Menu'; modeBtn.style.display = 'none'; }
    setMessage('Blackjack ready.');
    resetBlackjack();
  } else if(mode === 'roulette'){
    if(slotSection) slotSection.classList.add('hidden');
    if(bottomSpin) bottomSpin.classList.add('hidden');
    if(blackjackPanel) blackjackPanel.classList.add('hidden');
    if(roulettePanel) roulettePanel.classList.remove('hidden');
    if(crapsPanel) crapsPanel.classList.add('hidden');
    if(paytable) paytable.classList.add('hidden');
    if(modeBtn) modeBtn.textContent = 'Back to Menu';
    setMessage('Roulette ready.');
  } else {
    if(slotSection) slotSection.classList.remove('hidden');
    if(bottomSpin) bottomSpin.classList.remove('hidden');
    if(blackjackPanel) blackjackPanel.classList.add('hidden');
    if(roulettePanel) roulettePanel.classList.add('hidden');
    if(crapsPanel) crapsPanel.classList.add('hidden');
    if(paytable) paytable.classList.add('hidden');
    if(modeBtn) modeBtn.textContent = 'Back to Menu';
    setMessage('Ready — press Spin to play!');
  }
}

function resetBlackjack(){
  deck = createDeck();
  dealerCards = [];
  playerCards = [];
  updateBlackjackDisplay();
  setBJMessage('Use your bet and press Deal.');
  const dealBtn = $('#dealBtn');
  const hitBtn = $('#hitBtn');
  const standBtn = $('#standBtn');
  if(dealBtn) dealBtn.disabled = false;
  if(hitBtn) hitBtn.disabled = true;
  if(standBtn) standBtn.disabled = true;
}

function startBlackjackRound(){
  if(coins < bet){ setBJMessage('Not enough chips for blackjack.'); return; }
  coins -= bet;
  updateUI();
  gamesPlayed++; localStorage.setItem('gamesPlayed', gamesPlayed);
  if(deck.length < 15) deck = createDeck();
  playerCards = [drawCard(), drawCard()];
  dealerCards = [drawCard(), drawCard()];
  updateBlackjackDisplay();
  const playerVal = handValue(playerCards);
  const dealBtn = $('#dealBtn');
  const hitBtn = $('#hitBtn');
  const standBtn = $('#standBtn');
  if(dealBtn) dealBtn.disabled = true;
  if(hitBtn) hitBtn.disabled = false;
  if(standBtn) standBtn.disabled = false;
  if(playerVal === 21){ setBJMessage('Blackjack! Dealer draws...'); setTimeout(standBlackjack, 600); }
  else setBJMessage(`You have ${playerVal}. Hit or Stand?`);
}

function hitBlackjack(){
  playerCards.push(drawCard());
  updateBlackjackDisplay();
  const playerVal = handValue(playerCards);
  if(playerVal > 21){
    endBlackjackRound('lose');
  } else if(playerVal === 21){
    standBlackjack();
  } else {
    setBJMessage(`You have ${playerVal}. Hit or Stand?`);
  }
}

function standBlackjack(){
  let dealerVal = handValue(dealerCards);
  while(dealerVal < 17){
    dealerCards.push(drawCard());
    dealerVal = handValue(dealerCards);
  }
  const playerVal = handValue(playerCards);
  if(dealerVal > 21 || playerVal > dealerVal){
    endBlackjackRound('win');
  } else if(playerVal === dealerVal){
    endBlackjackRound('push');
  } else {
    endBlackjackRound('lose');
  }
}

function endBlackjackRound(result){
  const dealBtn = $('#dealBtn');
  const hitBtn = $('#hitBtn');
  const standBtn = $('#standBtn');
  if(dealBtn) dealBtn.disabled = false;
  if(hitBtn) hitBtn.disabled = true;
  if(standBtn) standBtn.disabled = true;
  const playerVal = handValue(playerCards);
  const dealerVal = handValue(dealerCards);
  if(result === 'win'){
    const winAmount = bet * 2;
    coins += winAmount;
    setBJMessage(`You win ${winAmount}! Dealer ${dealerVal}, You ${playerVal}.`);
    showPopup(`+${winAmount} chips`, 'win');
    playWin();
    wins++; localStorage.setItem('wins', wins); updateLeaderboard(winAmount);
  } else if(result === 'push'){
    coins += bet;
    setBJMessage(`Push. Dealer ${dealerVal}, You ${playerVal}. Bet returned.`);
    showPopup('Push', 'neutral');
  } else {
    setBJMessage(`Dealer wins. Dealer ${dealerVal}, You ${playerVal}.`);
    showPopup(`-${bet} chips`, 'lose');
  }
  updateUI();
}

function showMode(mode){ toggleMode(mode); }

function showRoulette(){
  const slotSection = document.querySelector('.slot');
  const bottomSpin = document.querySelector('.bottom-spin');
  const blackjackPanel = $('#blackjackPanel');
  const roulettePanel = $('#roulettePanel');
  const modeBtn = $('#modeBtn');
  const paytable = $('#paytable');
  if(slotSection) slotSection.classList.add('hidden');
  if(bottomSpin) bottomSpin.classList.add('hidden');
  if(blackjackPanel) blackjackPanel.classList.add('hidden');
  if(roulettePanel) roulettePanel.classList.remove('hidden');
  if(paytable) paytable.classList.add('hidden');
  if(modeBtn) modeBtn.textContent = 'Back to Menu';
  setMessage('Roulette ready.');
  $('#rouletteMessage').textContent = 'Place your bet!';
}

function placeRouletteBet(){
  if(coins < bet){ $('#rouletteMessage').textContent = 'Not enough chips!'; return; }
  coins -= bet;
  updateUI();
  gamesPlayed++; localStorage.setItem('gamesPlayed', gamesPlayed);
  const betType = $('#betType').value;
  let betValue = null;
  if(betType === 'number'){
    betValue = Number($('#betNumber').value);
  }
  $('#rouletteMessage').textContent = 'Spinning...';
  const wheel = $('#wheel');
  wheel.classList.add('spinning');
  let spin = 0;
  const spinInterval = setInterval(()=>{
    const num = Math.floor(Math.random()*37);
    wheel.textContent = num;
    spin++;
    if(spin > 30){
      clearInterval(spinInterval);
      wheel.classList.remove('spinning');
      const result = Math.floor(Math.random()*37);
      wheel.textContent = result;
      let win = 0;
      if(betType === 'number' && betValue === result){
        win = bet * 35;
      } else if(betType === 'red' && result > 0 && result % 2 === 1){
        win = bet * 1;
      } else if(betType === 'black' && result > 0 && result % 2 === 0){
        win = bet * 1;
      } else if(betType === 'even' && result > 0 && result % 2 === 0){
        win = bet * 1;
      } else if(betType === 'odd' && result > 0 && result % 2 === 1){
        win = bet * 1;
      }
      coins += win;
      updateUI();
      if(win > 0){ wins++; localStorage.setItem('wins', wins); updateLeaderboard(win); }
      $('#rouletteMessage').textContent = win > 0 ? `You won ${win} chips!` : 'No win.';
      playCoin();
    }
  }, 80);
}

function toggleBetType(){
  const betType = $('#betType').value;
  const numberBet = $('#numberBet');
  if(numberBet) numberBet.style.display = betType === 'number' ? 'block' : 'none';
}

function showProfile(){
  const profileStats = $('#profileStats');
  const playerName = localStorage.getItem('playerName') || 'Unknown';
  const totalChips = coins;
  const gamesPlayed = (localStorage.getItem('gamesPlayed') || 0);
  const wins = (localStorage.getItem('wins') || 0);
  profileStats.innerHTML = `
    <p><strong>Name:</strong> ${playerName}</p>
    <p><strong>Total Chips:</strong> ${totalChips}</p>
    <p><strong>Games Played:</strong> ${gamesPlayed}</p>
    <p><strong>Wins:</strong> ${wins}</p>
  `;
}

function showLeaderboard(){
  const leaderboardList = $('#leaderboardList');
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  leaderboard.sort((a,b) => b.score - a.score);
  leaderboardList.innerHTML = leaderboard.slice(0,10).map((entry, i) => `<p>${i+1}. ${entry.name}: ${entry.score} chips</p>`).join('');
}

function updateLeaderboard(winAmount){
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '[]');
  leaderboard.push({name: playerName, score: winAmount});
  localStorage.setItem('leaderboard', JSON.stringify(leaderboard));
}

function cardValue(card){
  const val = card.value;
  if(val === 'A') return 14;
  if(val === 'K') return 13;
  if(val === 'Q') return 12;
  if(val === 'J') return 11;
  return parseInt(val);
}

function cardSymbol(card){
  const suitSymbols = {'hearts':'♥','diamonds':'♦','clubs':'♣','spades':'♠'};
  return card.value + suitSymbols[card.suit];
}

function spin(){
  if(spinning) return;
  if(coins < bet){ setMessage('Not enough chips — play the mini-game to win chips.'); updateUI(); return; }
  spinning = true;
  coins -= bet; updateUI(); setMessage('Spinning...');
  gamesPlayed++; localStorage.setItem('gamesPlayed', gamesPlayed);

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
    msg = `You won ${totalWin} chips!`;
    playWin();
    burstConfetti();
    setTimeout(()=>playCoin(),200);
    wins++; localStorage.setItem('wins', wins); updateLeaderboard(totalWin);
  }

  const delta = totalWin - bet;
  if(delta > 0){
    showPopup(`+${delta} chips`, 'win');
  } else if(delta < 0){
    showPopup(`${delta} chips`, 'lose');
  } else {
    showPopup('Break even', 'neutral');
  }

  if(!msg) msg = 'No winning paylines.';
  setMessage(msg);
  updateUI();
}

// mini-game: 3 chests, one random contains coins
function setupMiniGame(){
  // Left sidebar Dish Duty game
  const openBtn = $('#openMini');
  const panel = $('#miniGamePanel');
  const startBtn = $('#startMini');
  const closePanel = $('#closeMiniPanel');
  if(openBtn && panel){
    openBtn.addEventListener('click', ()=>{ panel.classList.remove('hidden'); });
  }
  if(closePanel && panel){
    closePanel.addEventListener('click', ()=>{ if(!miniRunning) panel.classList.add('hidden'); });
  }
  if(startBtn) startBtn.addEventListener('click', startDishDuty);
}

// --- Advanced Dish Duty mini-game ---
let miniTimerId = null;
let miniDirtyInterval = null;
let miniTime = 30; // seconds
let platesCount = 16;
let washed = 0;
let miniScore = 0;
let miniRunning = false;

function startDishDuty(){
  const panel = $('#miniGamePanel');
  if(!panel || miniRunning) return;
  miniRunning = true;
  washed = 0;
  miniScore = 0;
  $('#washedCount').textContent = washed;
  $('#miniScore').textContent = miniScore;
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
    if(t<=0){ endDishDuty(); }
  },1000);

  // periodically mark random plates dirty
  miniDirtyInterval = setInterval(()=>{
    const plates = Array.from(document.querySelectorAll('#plates .plate'));
    const candidates = plates.filter(p=> !p.classList.contains('washed') && !p.classList.contains('dirty') && !p.classList.contains('super-dirty') && !p.classList.contains('golden'));
    if(candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random()*candidates.length)];
    const rand = Math.random();
    if(rand < 0.1){ // 10% golden
      pick.classList.add('golden');
      pick.textContent = '🥇';
    } else if(rand < 0.3){ // 20% super-dirty
      pick.classList.add('super-dirty');
      pick.textContent = '🧽';
    } else { // 70% dirty
      pick.classList.add('dirty');
      pick.textContent = '🍽️';
    }
  }, 800);

  setMessage('Dish Duty: Click dirty plates to clean them! Golden plates give bonus points.');
}

function washPlate(btn){
  if(!btn || btn.classList.contains('washed')) return;
  let points = 1;
  if(btn.classList.contains('golden')){
    points = 5;
  } else if(btn.classList.contains('super-dirty')){
    points = 3;
  } else if(btn.classList.contains('dirty')){
    points = 2;
  } else {
    return; // not dirty
  }
  btn.classList.remove('dirty', 'super-dirty', 'golden');
  btn.classList.add('washed');
  btn.textContent = '✨';
  washed++;
  miniScore += points;
  $('#washedCount').textContent = washed;
  $('#miniScore').textContent = miniScore;
  playClick();
}

function endDishDuty(){
  if(miniTimerId) clearInterval(miniTimerId);
  miniTimerId = null;
  if(miniDirtyInterval) clearInterval(miniDirtyInterval);
  miniDirtyInterval = null;
  miniRunning = false;
  // reward: base 1 chip per plate, bonus for score
  const baseReward = washed;
  const bonus = Math.floor(miniScore / 10);
  const reward = baseReward + bonus;
  coins += reward;
  updateUI();
  setMessage(`Dish Duty over — washed ${washed} plates, score ${miniScore}, earned ${reward} chips.`);
  // leave panel open so user can start again; re-enable controls
  $('#startMini').disabled = false;
  $('#openMini').disabled = false;
  $('#closeMiniPanel').disabled = false;
  $('#miniTimer').textContent = 30;
  $('#washedCount').textContent = 0;
  $('#miniScore').textContent = 0;
}

// --- Save/Load ---
function saveGame(){
  const slot = $('#saveSlot').value;
  const saveData = {
    coins,
    bet,
    ownedItems,
    currentBg: document.body.style.background,
    currentTheme: {
      bg: getComputedStyle(document.documentElement).getPropertyValue('--bg'),
      panel: getComputedStyle(document.documentElement).getPropertyValue('--panel'),
      accent: getComputedStyle(document.documentElement).getPropertyValue('--accent'),
      text: getComputedStyle(document.documentElement).getPropertyValue('--text')
    }
  };
  localStorage.setItem(`saveSlot${slot}`, JSON.stringify(saveData));
  alert(`Game saved to slot ${slot}!`);
}

function loadGame(){
  const slot = $('#saveSlot').value;
  const saveData = JSON.parse(localStorage.getItem(`saveSlot${slot}`));
  if(!saveData){ alert('No save data in this slot!'); return; }
  coins = saveData.coins || 10;
  bet = saveData.bet || 1;
  ownedItems = saveData.ownedItems || [];
  updateUI();
  buildPaytable();
  // Apply items
  ownedItems.forEach(applyItem);
  // Apply custom bg/theme
  if(saveData.currentBg) document.body.style.background = saveData.currentBg;
  if(saveData.currentTheme){
    document.documentElement.style.setProperty('--bg', saveData.currentTheme.bg);
    document.documentElement.style.setProperty('--panel', saveData.currentTheme.panel);
    document.documentElement.style.setProperty('--accent', saveData.currentTheme.accent);
    if(saveData.currentTheme.text){
      document.documentElement.style.setProperty('--text', saveData.currentTheme.text);
    } else {
      setThemeContrast(saveData.currentTheme.bg, saveData.currentTheme.panel);
    }
  } else {
    applyDefaultTheme();
  }
  alert(`Game loaded from slot ${slot}!`);
}

// --- Shop ---
let ownedItems = JSON.parse(localStorage.getItem('ownedItems') || '[]');

function applyDefaultTheme(){
  document.documentElement.style.setProperty('--bg', defaultTheme.bg);
  document.documentElement.style.setProperty('--panel', defaultTheme.panel);
  document.documentElement.style.setProperty('--accent', defaultTheme.accent);
  setThemeContrast(defaultTheme.bg, defaultTheme.panel);
}

function initShop(){
  const shopItemsContainer = document.querySelector('.shop-items');
  if(shopItemsContainer){
    const bgItems = Array.from(shopItemsContainer.querySelectorAll('.shop-item[data-item^="bg"]'))
      .sort((a,b)=> Number(a.dataset.cost) - Number(b.dataset.cost));
    const themeItems = Array.from(shopItemsContainer.querySelectorAll('.shop-item[data-item^="theme"]'))
      .sort((a,b)=> Number(a.dataset.cost) - Number(b.dataset.cost));
    bgItems.forEach(item => shopItemsContainer.appendChild(item));
    themeItems.forEach(item => shopItemsContainer.appendChild(item));
  }

  const items = document.querySelectorAll('.shop-item');
  items.forEach(item => {
    const btn = item.querySelector('button');
    const cost = Number(item.dataset.cost);
    const itemId = item.dataset.item;
    if(ownedItems.includes(itemId)){
      btn.textContent = 'Owned';
      btn.disabled = true;
      btn.onclick = null;
    } else {
      btn.textContent = 'Buy';
      btn.disabled = false;
      btn.onclick = () => buyItem(itemId, cost, btn);
    }
  });

  const shopCoins = $('#shopCoins');
  if(shopCoins) shopCoins.textContent = coins;
}

function buyItem(itemId, cost, btn){
  if(coins < cost){
    alert('Not enough chips!');
    return;
  }
  coins -= cost;
  updateUI();
  ownedItems.push(itemId);
  localStorage.setItem('ownedItems', JSON.stringify(ownedItems));
  btn.textContent = 'Owned';
  btn.disabled = true;
  applyItem(itemId);
  playCoin();
}

function applyItem(itemId){
  if(itemId.startsWith('bg')){
    // Change background
    const gradients = {
      bg1: 'linear-gradient(180deg, #ff6b6b, #4ecdc4)',
      bg2: 'linear-gradient(180deg, #667eea, #764ba2)',
      bg3: 'linear-gradient(180deg, #f093fb, #f5576c)',
      bg4: 'linear-gradient(180deg, #4facfe, #00f2fe)',
      bg5: 'linear-gradient(180deg, #43e97b, #38f9d7)',
      bg6: 'linear-gradient(180deg, #ff9a9e, #fecfef)',
      bg7: 'linear-gradient(180deg, #a8edea, #fed6e3)',
      bg8: 'linear-gradient(180deg, #d299c2, #fef9d7)',
      bg9: 'linear-gradient(180deg, #667eea, #764ba2)',
      bg10: 'linear-gradient(180deg, #f093fb, #f5576c)',
      bg11: 'linear-gradient(180deg, #ffecd2, #fcb69f)',
      bg12: 'linear-gradient(180deg, #a8c0ff, #3f2b96)',
      bg13: 'linear-gradient(180deg, #ff9a9e, #fecfef, #ffecd2)',
      bg14: 'linear-gradient(180deg, #667eea, #764ba2, #f093fb)'
    };
    document.body.style.background = gradients[itemId] || 'linear-gradient(180deg,var(--bg),#000)';
  } else if(itemId.startsWith('theme')){
    // Change theme colors
    const themes = {
      theme1: {bg: '#050505', panel: '#1a1a1a', accent: '#ffd700'},
      theme2: {bg: '#2f0700', panel: '#2e1211', accent: '#ff4500'},
      theme3: {bg: '#061607', panel: '#0d1b0f', accent: '#39ff14'},
      theme4: {bg: '#07070a', panel: '#1f1f24', accent: '#ffffff'},
      theme5: {bg: '#fbfbf9', panel: '#eeeeee', accent: '#111111'},
      theme6: {bg: '#f7e000', panel: '#fff8d0', accent: '#000000'},
      theme7: {bg: '#080822', panel: '#121639', accent: '#4dd2ff'},
      theme8: {bg: '#f4f0e6', panel: '#e4d8c2', accent: '#2b2b2b'},
      theme9: {bg: '#141026', panel: '#211b38', accent: '#ff9bff'}
    };
    const theme = themes[itemId];
    if(theme){
      document.documentElement.style.setProperty('--bg', theme.bg);
      document.documentElement.style.setProperty('--panel', theme.panel);
      document.documentElement.style.setProperty('--accent', theme.accent);
      setThemeContrast(theme.bg, theme.panel);
    }
  }
}

function setThemeContrast(backgroundColor, panelColor){
  const parseColor = hex => {
    const value = hex.trim().replace('#','');
    const full = value.length === 3 ? value.split('').map(c => c+c).join('') : value;
    return {
      r: parseInt(full.slice(0,2),16),
      g: parseInt(full.slice(2,4),16),
      b: parseInt(full.slice(4,6),16)
    };
  };
  const getLum = ({r,g,b}) => {
    const norm = [r,g,b].map(v => {
      const p = v / 255;
      return p <= 0.03928 ? p / 12.92 : Math.pow((p + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * norm[0] + 0.7152 * norm[1] + 0.0722 * norm[2];
  };
  const bgLum = getLum(parseColor(backgroundColor || '#000000'));
  const panelLum = getLum(parseColor(panelColor || '#111111'));
  const useDark = bgLum > 0.55 || panelLum > 0.55;
  document.documentElement.style.setProperty('--text', useDark ? '#111' : '#fff');
  document.documentElement.style.setProperty('--button-text', useDark ? '#111' : '#fff');
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

  // Menu buttons
  $('#menuSlots').addEventListener('click', () => switchView('slots'));
  $('#menuShop').addEventListener('click', () => { switchView('shop'); initShop(); });
  $('#menuProfile').addEventListener('click', () => switchView('profile'));
  $('#menuLeaderboard').addEventListener('click', () => switchView('leaderboard'));
  $('#backToMenu').addEventListener('click', () => switchView('menu'));
  $('#closeShop').addEventListener('click', () => switchView('menu'));
  $('#closeProfile').addEventListener('click', () => switchView('menu'));
  $('#closeLeaderboard').addEventListener('click', () => switchView('menu'));

  // Save/Load
  $('#saveGame').addEventListener('click', saveGame);
  $('#loadGame').addEventListener('click', loadGame);

  updateUI(); setMessage('Ready — press Spin to play!');
  $('#spinBtn').addEventListener('click', spin);
  setupMiniGame();
  const modeBtn = $('#modeBtn');
  if(modeBtn){ modeBtn.addEventListener('click', () => switchView('menu')); }
  const dealBtn = $('#dealBtn');
  const hitBtn = $('#hitBtn');
  const standBtn = $('#standBtn');
  if(dealBtn) dealBtn.addEventListener('click', startBlackjackRound);
  if(hitBtn) hitBtn.addEventListener('click', hitBlackjack);
  if(standBtn) standBtn.addEventListener('click', standBlackjack);
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
  applyDefaultTheme();
  updateUI();
  // Apply owned items
  ownedItems.forEach(applyItem);

  // Changing menu comments
  const comments = [
    "Welcome to the ultimate casino experience!",
    "Spin the reels and hit the jackpot!",
    "Test your luck with blackjack!",
    "Try your fortune on the roulette wheel!",
    "Customize your casino in the shop!",
    "Earn chips with mini-games!",
    "Feel the thrill of the casino!"
  ];
  let commentIndex = 0;
  setInterval(() => {
    commentIndex = (commentIndex + 1) % comments.length;
    $('#menuComment').textContent = comments[commentIndex];
  }, 3000);
});

