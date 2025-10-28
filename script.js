// 🎮 Element Selectors
const openAudio = document.getElementById("open-audio");
const introScreen = document.getElementById("intro-screen");
const startBtn = document.getElementById("start-btn");
const curtainLeft = document.getElementById("curtain-left");
const curtainRight = document.getElementById("curtain-right");
const gameRoot = document.getElementById("game-root");
const cells = document.querySelectorAll(".cell");
const statusText = document.getElementById("status");
const restartBtn = document.getElementById("restart");
const themeToggle = document.getElementById("theme-toggle");
const resultOverlay = document.getElementById("result-overlay");
const resultText = document.getElementById("result-text");
const resultGif = document.getElementById("result-gif");
const playAgainBtn = document.getElementById("play-again");
const closeResultBtn = document.getElementById("close-result");
const winLine = document.getElementById("win-line");

// 🔊 Sounds
const introAudio = document.getElementById("intro-audio");
const clickAudio = document.getElementById("click-audio");
const winAudio = document.getElementById("win-audio");
const drawAudio = document.getElementById("draw-audio");
const hardAudioEl = document.getElementById("hard-audio"); // declared in HTML

// 🆕 Screens
const modeScreen = document.getElementById("mode-screen");
const modeNext = document.getElementById("mode-next");
const usernameScreen = document.getElementById("username-screen");
const usernameNext = document.getElementById("username-next");
const player1Input = document.getElementById("player1-name");
const player2Input = document.getElementById("player2-name");
const difficultyScreen = document.getElementById("difficulty-screen");
const difficultyNext = document.getElementById("difficulty-next");

// 🆕 Back Buttons
const modeBack = document.getElementById("mode-back");
const usernameBack = document.getElementById("username-back");
const difficultyBack = document.getElementById("difficulty-back");
const backToMain = document.getElementById("back-to-main");

// scoreboard and unlock overlay nodes (created lazily)
let scoreboardDiv = null;
let unlockOverlay = null;

// 🎯 Game State
let currentPlayer = "X";
let running = false;
let board = Array(9).fill("");
let gameMode = "computer";
let player1Name = "";
let player2Name = "";
let difficulty = "easy";
let player1Wins = 0;
let player2Wins = 0;

// Timeout handle for hiding win line
let lineTimeout = null;

const winPatterns = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

/* --------------------------
   Utility: show/hide helpers
   -------------------------- */
function show(el){ el.classList.remove('hidden'); el.classList.add('fade-in'); el.classList.remove('fade-out'); }
function hide(el){ el.classList.add('fade-out'); el.classList.remove('fade-in'); setTimeout(()=>el.classList.add('hidden'), 380); }

/* --------------------------
   Clear inputs on page load
   -------------------------- */
window.addEventListener('load', () => {
  // ensure name fields start blank every visit
  if (player1Input) player1Input.value = '';
  if (player2Input) player2Input.value = '';
  // start with open audio playing softly (if allowed by browser)
  try { openAudio.currentTime = 0; openAudio.play().catch(()=>{}); } catch(e){}
});

/* --------------------------
   Intro curtain
   -------------------------- */
startBtn.addEventListener("click", () => {
  try { openAudio.currentTime = 0; openAudio.play().catch(()=>{}); } catch(e){}
  curtainLeft.classList.add("open");
  curtainRight.classList.add("open");
  setTimeout(()=>{
    hide(introScreen);
    show(modeScreen);
  }, 2000);
});

/* --------------------------
   Back navigation w/ clearing username fields
   -------------------------- */
modeBack.addEventListener('click', ()=>{
  hide(modeScreen);
  // show intro and reset curtains (nice visual)
  show(introScreen);
  curtainLeft.classList.remove("open");
  curtainRight.classList.remove("open");
  // clear name inputs
  if (player1Input) player1Input.value = '';
  if (player2Input) player2Input.value = '';
});

usernameBack.addEventListener('click', ()=>{
  hide(usernameScreen);
  show(modeScreen);
  if (player2Input) player2Input.value = '';
});

difficultyBack.addEventListener('click', ()=>{
  hide(difficultyScreen);
  show(usernameScreen);
});

/* back from game to main */
backToMain.addEventListener('click', ()=>{
  hide(gameRoot);
  show(modeScreen);
  // re-enable open audio
  try { openAudio.currentTime = 0; openAudio.play().catch(()=>{}); } catch(e){}
  // clear username fields for fresh entry next time:
  if (player1Input) player1Input.value = '';
  if (player2Input) player2Input.value = '';
  // turn off hard-mode style (if any)
  document.body.classList.remove('hard-mode');
});

/* --------------------------
   Flow: Mode -> Username -> Difficulty
   -------------------------- */
modeNext.addEventListener('click', ()=>{
  const selected = document.querySelector('input[name="mode"]:checked').value;
  gameMode = selected;
  hide(modeScreen);
  show(usernameScreen);
  if (gameMode === 'computer') document.querySelector('.player2-field').classList.add('hidden');
  else document.querySelector('.player2-field').classList.remove('hidden');
});

usernameNext.addEventListener('click', ()=>{
  const p1 = (player1Input && player1Input.value.trim()) || '';
  const p2 = (player2Input && player2Input.value.trim()) || '';
  if (gameMode === 'computer') {
    if (!p1) return alert('Please enter your name!');
    player1Name = p1;
    player2Name = 'Computer';
  } else {
    if (!p1 || !p2) return alert('Please enter both names!');
    player1Name = p1;
    player2Name = p2;
  }
  hide(usernameScreen);
  show(difficultyScreen);
});

difficultyNext.addEventListener('click', ()=>{
  const selected = document.querySelector('input[name="difficulty"]:checked').value;
  difficulty = selected;
  hide(difficultyScreen);
  // stop open audio and play game intro
  try { openAudio.pause(); } catch(e){}
  try { introAudio.currentTime = 0; introAudio.play().catch(()=>{}); } catch(e){}
  // prepare scoreboard & start
  show(gameRoot);
  initializeGame();
});

/* --------------------------
   Initialize Game & Scoreboard
   -------------------------- */
function initializeGame(){
  // clear board state
  board = Array(9).fill('');
  cells.forEach((c,i)=>{
    c.textContent = '';
    c.removeEventListener('click', cellClicked);
    c.addEventListener('click', cellClicked);
  });
  // restart button and result overlay handlers
  restartBtn.removeEventListener('click', restartGame);
  restartBtn.addEventListener('click', restartGame);
  playAgainBtn.removeEventListener('click', restartGame);
  playAgainBtn.addEventListener('click', restartGame);
  closeResultBtn.removeEventListener('click', ()=>resultOverlay.classList.add('hidden'));
  closeResultBtn.addEventListener('click', ()=> resultOverlay.classList.add('hidden'));
  themeToggle.removeEventListener('click', toggleTheme);
  themeToggle.addEventListener('click', toggleTheme);

  // ensure scoreboard exists
  if (!scoreboardDiv) createScoreboard();
  updateScoreboard();

  // set flags
  currentPlayer = 'X';
  running = true;
  updateStatusText();
  // ensure restart button not too low (CSS handles height)
}

/* scoreboard creation / update */
function createScoreboard(){
  scoreboardDiv = document.createElement('div');
  scoreboardDiv.className = 'scoreboard';
  // insert scoreboard before restart button for predictable layout
  gameRoot.insertBefore(scoreboardDiv, restartBtn);
}
function updateScoreboard(){
  if (!scoreboardDiv) return;
  // textual label changes for clarity
  scoreboardDiv.innerHTML = `${player1Name}: ${player1Wins} &nbsp;&nbsp; | &nbsp;&nbsp; ${player2Name}: ${player2Wins}`;
  // color tweaks for visibility
  if (document.body.classList.contains('hard-mode')) {
    scoreboardDiv.style.color = '#ffd1ff';
  } else if (document.body.classList.contains('dark')) {
    scoreboardDiv.style.color = '#00ffff';
  } else {
    scoreboardDiv.style.color = '#1b0045';
  }
}

/* --------------------------
   Move handlers & AI
   -------------------------- */
function updateStatusText(){
  if (!statusText) return;
  statusText.textContent = `${currentPlayer === 'X' ? player1Name : player2Name}'s turn (${currentPlayer})`;
}

function cellClicked(){
  const index = parseInt(this.getAttribute('cellIndex'));
  if (board[index] !== '' || !running) return;
  board[index] = currentPlayer;
  this.textContent = currentPlayer;
  try { clickAudio.currentTime = 0; clickAudio.play().catch(()=>{}); } catch(e){}
  checkWinner();
  if (running && gameMode === 'computer' && currentPlayer === 'O') {
    setTimeout(computerMove, 500);
  }
}

function computerMove(){
  const empties = board.map((v,i)=> v === '' ? i : null).filter(n => n!==null);
  if (!empties.length) return;
  let choice;
  if (difficulty === 'easy') {
    choice = empties[Math.floor(Math.random()*empties.length)];
  } else {
    choice = findBlockingMove() ?? empties[Math.floor(Math.random()*empties.length)];
  }
  board[choice] = currentPlayer;
  cells[choice].textContent = currentPlayer;
  try { clickAudio.currentTime = 0; clickAudio.play().catch(()=>{}); } catch(e){}
  checkWinner();
}

/* simple blocking logic */
function findBlockingMove(){
  for (let pattern of winPatterns){
    const [a,b,c] = pattern;
    const line = [board[a], board[b], board[c]];
    if (line.filter(v=>v==='X').length === 2 && line.includes('')) {
      return pattern[line.indexOf('')];
    }
  }
  return null;
}

/* --------------------------
   Winner detection & scoring
   -------------------------- */
function checkWinner(){
  let winPattern = null;
  for (let pattern of winPatterns){
    const [a,b,c] = pattern;
    if (board[a] && board[a] === board[b] && board[b] === board[c]) {
      winPattern = pattern;
      break;
    }
  }

  if (winPattern){
    running = false;
    try { winAudio.currentTime = 0; winAudio.play().catch(()=>{}); } catch(e){}
    drawWinLine(winPattern);
    launchBubbleRain();

    // increment appropriate counter
    if (currentPlayer === 'X') player1Wins++;
    else player2Wins++;

    updateScoreboard();

    // if in hard-mode, show special victory animation
    if (document.body.classList.contains('hard-mode')) {
  showHardVictory(`${currentPlayer === 'X' ? player1Name : player2Name} Wins!`);
} else {
  // ✅ Updated GIF logic based on winner and mode
  let gifPath = "";
  if (gameMode === "computer") {
    // if playing vs computer
    gifPath = currentPlayer === "X" ? "gifs/user-win.gif" : "gifs/computer-win.gif";
  } else {
    // if playing player vs player, use user-win for both
    gifPath = "gifs/user-win.gif";
  }
  showResult(`${currentPlayer === 'X' ? player1Name : player2Name} Wins!`, gifPath);
}


    // check unlock condition only for reaching 3 wins (either side)
    if (player1Wins >= 3 || player2Wins >= 3) {
      // reset counters and show unlock (for both sides)
      player1Wins = 0;
      player2Wins = 0;
      updateScoreboard();
      setTimeout(showUnlockOverlay, 900);
    }

  } else if (!board.includes('')) {
    running = false;
    try { drawAudio.currentTime = 0; drawAudio.play().catch(()=>{}); } catch(e){}
    showResult("It's a Draw!", "gifs/draw.gif");
  } else {
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    updateStatusText();
  }
}

/* --------------------------
   Hard-mode unlock overlay
   -------------------------- */
function showUnlockOverlay(){
  // reuse existing overlay area if present
  if (unlockOverlay) unlockOverlay.remove();
  unlockOverlay = document.createElement('div');
  unlockOverlay.className = 'overlay fade-in';
  unlockOverlay.innerHTML = `
    <div class="unlock-box">
      <h2 class="unlock-title">🏆 Congratulations!</h2>
      <p class="unlock-message">Special Hard Mode Unlocked 🔥</p>
      <button id="enter-hard" class="next-btn">Enter Hard Mode</button>
    </div>
  `;
  document.body.appendChild(unlockOverlay);
  document.getElementById('enter-hard').addEventListener('click', ()=>{
    // close overlay and enter hard mode
    unlockOverlay.classList.add('fade-out');
    setTimeout(()=> {
      if (unlockOverlay) unlockOverlay.remove();
      unlockOverlay = null;
      enterHardMode();
    }, 420);
  });
}

/* --------------------------
   Enter Hard Mode
   -------------------------- */
function enterHardMode(){
  document.body.classList.add('hard-mode');
  // stop intro and play hard jingle
  try { introAudio.pause(); } catch(e){}
  try { hardAudioEl.currentTime = 0; hardAudioEl.play().catch(()=>{}); } catch(e){}
  // restart board (fresh round)
  restartGame();
}

/* --------------------------
   Hard-mode victory animation & auto-exit
   -------------------------- */
function showHardVictory(message){
  // show a centered pulse box with message
  const hv = document.createElement('div');
  hv.className = 'hard-victory';
  hv.innerHTML = `
    <div class="pulse-box">
      <div class="pulse-title">${message}</div>
      <div class="pulse-sub">You've conquered the arena!</div>
    </div>
  `;
  document.body.appendChild(hv);

  // play short hardAudio snippet if available
  try { hardAudioEl.currentTime = 0; hardAudioEl.play().catch(()=>{}); } catch(e){}

  // after 5.5s remove overlay and exit hard-mode
  setTimeout(()=> {
    hv.classList.add('fade-out');
    setTimeout(()=> {
      if (hv && hv.parentNode) hv.parentNode.removeChild(hv);
      // auto-exit hard mode
      document.body.classList.remove('hard-mode');
      // optional: resume open audio or game intro
      try { openAudio.currentTime = 0; openAudio.play().catch(()=>{}); } catch(e){}
      // return to mode selection (or keep on gameRoot; we will keep game visible but normal theme)
      // keep the game running — but visual theme returns to normal
    }, 420);
  }, 5500);
}

/* --------------------------
   Visual helpers: draw line, bubble rain
   -------------------------- */
function drawWinLine(pattern){
  const boardRect = document.querySelector('.board').getBoundingClientRect();
  const cellSize = boardRect.width / 3;
  const positions = [
    [cellSize*0.5, cellSize*0.5],
    [cellSize*1.5, cellSize*0.5],
    [cellSize*2.5, cellSize*0.5],
    [cellSize*0.5, cellSize*1.5],
    [cellSize*1.5, cellSize*1.5],
    [cellSize*2.5, cellSize*1.5],
    [cellSize*0.5, cellSize*2.5],
    [cellSize*1.5, cellSize*2.5],
    [cellSize*2.5, cellSize*2.5],
  ];
  const [x1,y1] = positions[pattern[0]];
  const [x2,y2] = positions[pattern[2]];
  const dx = x2-x1, dy = y2-y1;
  const length = Math.sqrt(dx*dx + dy*dy);
  const angle = Math.atan2(dy,dx) * 180/Math.PI;
  winLine.style.transition = 'none';
  winLine.style.width = '0';
  winLine.style.left = `${x1}px`;
  winLine.style.top = `${y1}px`;
  winLine.style.transform = `rotate(${angle}deg)`;
  setTimeout(()=> {
    winLine.style.transition = 'width .4s ease, opacity .3s ease';
    winLine.style.width = `${length}px`;
    winLine.style.opacity = '1';
  }, 60);
}

function launchBubbleRain(){
  const bubbleContainer = document.createElement('div');
  bubbleContainer.className = 'bubble-rain';
  for (let i=0;i<28;i++){
    const bubble = document.createElement('span');
    bubble.className = 'bubble';
    const size = Math.random()*18 + 8;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random()*100}vw`;
    bubble.style.animationDuration = `${1.8 + Math.random()*2}s`;
    bubble.style.background = `radial-gradient(circle, rgba(166,77,255,0.85), rgba(80,0,120,0.45))`;
    bubble.style.boxShadow = `0 0 12px rgba(166,77,255,0.9)`;
    bubbleContainer.appendChild(bubble);
  }
  document.body.appendChild(bubbleContainer);
  setTimeout(()=> bubbleContainer.remove(), 3000);
}

/* --------------------------
   Result overlay and restart
   -------------------------- */
function showResult(text, gif){
  resultText.textContent = text;
  resultGif.src = gif || '';
  show(resultOverlay);
}

function restartGame(){
  // clear board and keep scoreboard intact (session persistent)
  board = Array(9).fill('');
  cells.forEach(c => c.textContent = '');
  currentPlayer = 'X';
  running = true;
  winLine.style.opacity = '0';
  winLine.style.width = '0';
  hide(resultOverlay);
  updateStatusText();
}

/* --------------------------
   Theme toggle
   -------------------------- */
function toggleTheme(){
  const body = document.body;
  if (body.classList.contains('dark')) {
    body.classList.replace('dark','light');
    themeToggle.textContent = '🌙 Dark Mode';
  } else {
    body.classList.replace('light','dark');
    themeToggle.textContent = '☀️ Light Mode';
  }
}
