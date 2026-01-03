class BattleshipGame {
    constructor() {
        this.gridSize = 10;
        this.ships = [
            { name: "Авианосец", size: 5, count: 1 },
            { name: "Линкор", size: 4, count: 1 },
            { name: "Крейсер", size: 3, count: 2 },
            { name: "Эсминец", size: 2, count: 3 },
            { name: "Катер", size: 1, count: 4 }
        ];
        
        this.playerShips = [];
        this.botShips = [];
        this.playerHits = 0;
        this.botHits = 0;
        this.gameStarted = false;
        this.currentShip = null;
        this.shipOrientation = 'horizontal';
        this.difficulty = 'medium';
        this.botMemory = [];
        this.lastHit = null;
        this.huntingMode = false;
        this.huntDirections = [];
        this.shotCount = 0;
        this.startTime = null;
        this.gameTime = 0;
        this.volume = 0.5;
        
        // Статистика
        this.playerShots = 0;
        this.playerSuccessfulShots = 0;
        this.botShots = 0;
        this.botSuccessfulShots = 0;
        
        this.init();
    }
    
    init() {
        this.createGrids();
        this.setupEventListeners();
        this.createShipSelector();
        this.updateStatus("Расставьте ваши корабли на поле");
        this.startGameTimer();
        this.setupAudio();
    }
    
    setupAudio() {
        this.audio = {
            shot: document.getElementById('sound-shot'),
            hit: document.getElementById('sound-hit'),
            miss: document.getElementById('sound-miss'),
            sunk: document.getElementById('sound-ship-sunk'),
            win: document.getElementById('sound-win'),
            lose: document.getElementById('sound-lose'),
            sea: document.getElementById('sound-sea')
        };
        
        // Устанавливаем громкость
        this.updateVolume();
        
        // Запускаем фоновый звук моря
        this.audio.sea.volume = this.volume * 0.3;
        this.audio.sea.play().catch(e => console.log("Автовоспроизведение звука заблокировано"));
    }
    
    updateVolume() {
        const volume = this.volume;
        Object.values(this.audio).forEach(audio => {
            if (audio) {
                audio.volume = volume;
            }
        });
    }
    
    playSound(sound) {
        if (this.audio[sound]) {
            this.audio[sound].currentTime = 0;
            this.audio[sound].play().catch(e => console.log("Ошибка воспроизведения звука"));
        }
    }
    
    startGameTimer() {
        this.startTime = Date.now();
        setInterval(() => {
            if (this.gameStarted) {
                this.gameTime = Math.floor((Date.now() - this.startTime) / 1000);
            }
        }, 1000);
    }
    
    createGrids() {
        const playerGrid = document.getElementById('player-grid');
        const botGrid = document.getElementById('bot-grid');
        
        playerGrid.innerHTML = '';
        botGrid.innerHTML = '';
        
        // Создаем ячейки для игрока
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                const playerCell = this.createCell(row, col, 'player');
                playerGrid.appendChild(playerCell);
                
                const botCell = this.createCell(row, col, 'bot');
                botGrid.appendChild(botCell);
            }
        }
    }
    
    createCell(row, col, type) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = row;
        cell.dataset.col = col;
        
        if (type === 'player') {
            cell.addEventListener('click', () => this.placeShip(row, col));
        } else {
            cell.addEventListener('click', () => this.playerAttack(row, col));
        }
        
        return cell;
    }
    
    createShipSelector() {
        const container = document.getElementById('ships-list');
        container.innerHTML = '';
        
        this.ships.forEach(ship => {
            for (let i = 0; i < ship.count; i++) {
                const shipElement = document.createElement('div');
                shipElement.className = 'ship-item';
                shipElement.dataset.size = ship.size;
                shipElement.dataset.name = ship.name;
                
                // Создаем части корабля
                for (let j = 0; j < ship.size; j++) {
                    const part = document.createElement('div');
                    part.className = 'ship-part';
                    shipElement.appendChild(part);
                }
                
                shipElement.addEventListener('click', () => {
                    this.selectShip(shipElement, ship.size, ship.name);
                });
                
                container.appendChild(shipElement);
            }
        });
        
        // Выбираем первый корабль
        const firstShip = container.querySelector('.ship-item');
        if (firstShip) {
            this.selectShip(firstShip, firstShip.dataset.size, firstShip.dataset.name);
        }
    }
    
    selectShip(element, size, name) {
        // Снимаем выделение со всех кораблей
        document.querySelectorAll('.ship-item').forEach(ship => {
            ship.classList.remove('selected');
        });
        
        // Выделяем выбранный корабль
        element.classList.add('selected');
        
        this.currentShip = {
            size: parseInt(size),
            name: name,
            element: element
        };
        
        this.updateStatus(`Выбран ${name} (${size} палуб)`);
    }
    
    setupEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('random-ships').addEventListener('click', () => this.randomPlacement());
        document.getElementById('rotate-ship').addEventListener('click', () => this.rotateShip());
        document.getElementById('clear-board').addEventListener('click', () => this.clearBoard());
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
            this.addLogMessage(`Уровень сложности изменен: ${this.getDifficultyName()}`, "system");
        });
        document.getElementById('play-again').addEventListener('click', () => this.resetGame());
        document.getElementById('close-modal').addEventListener('click', () => this.hideModal());
        document.getElementById('share-result').addEventListener('click', () => this.shareResult());
        document.getElementById('clear-log').addEventListener('click', () => this.clearLog());
        document.getElementById('volume').addEventListener('input', (e) => {
            this.volume = e.target.value / 100;
            this.updateVolume();
        });
    }
    
    getDifficultyName() {
        const names = {
            easy: "Лёгкий",
            medium: "Средний",
            hard: "Сложный"
        };
        return names[this.difficulty] || "Средний";
    }
    
    rotateShip() {
        this.shipOrientation = this.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        document.getElementById('orientation').textContent = 
            this.shipOrientation === 'horizontal' ? 'Горизонтальная' : 'Вертикальная';
        
        this.addLogMessage(`Ориентация корабля изменена на ${this.shipOrientation === 'horizontal' ? 'горизонтальную' : 'вертикальную'}`, "system");
    }
    
    placeShip(row, col) {
        if (this.gameStarted || !this.currentShip) return;
        
        const shipSize = this.currentShip.size;
        const cells = [];
        let valid = true;
        
        // Проверяем, можно ли разместить корабль
        for (let i = 0; i < shipSize; i++) {
            const r = this.shipOrientation === 'horizontal' ? row : row + i;
            const c = this.shipOrientation === 'horizontal' ? col + i : col;
            
            if (r >= this.gridSize || c >= this.gridSize) {
                valid = false;
                break;
            }
            
            // Проверяем соседние клетки
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                        const cell = document.querySelector(`#player-grid .cell[data-row="${nr}"][data-col="${nc}"]`);
                        if (cell && cell.classList.contains('ship')) {
                            valid = false;
                        }
                    }
                }
            }
            
            cells.push({ row: r, col: c });
        }
        
        if (!valid) {
            this.showError("Нельзя разместить корабль здесь!");
            return;
        }
        
        // Размещаем корабль
        cells.forEach(({ row, col }) => {
            const cell = document.querySelector(`#player-grid .cell[data-row="${row}"][data-col="${col}"]`);
            cell.classList.add('ship');
        });
        
        this.playerShips.push({
            name: this.currentShip.name,
            size: shipSize,
            cells: cells,
            hits: 0
        });
        
        // Удаляем корабль из списка доступных
        this.currentShip.element.remove();
        
        // Выбираем следующий корабль
        const nextShip = document.querySelector('.ship-item');
        if (nextShip) {
            nextShip.click();
        } else {
            this.currentShip = null;
            this.updateStatus("Все корабли размещены! Нажмите 'Начать игру'");
        }
        
        this.updateShipCounters();
        this.addLogMessage(`${this.currentShip?.name || 'Корабль'} размещен`, "system");
    }
    
    showError(message) {
        this.updateStatus(message);
        const statusBar = document.querySelector('.status-bar');
        statusBar.style.animation = 'none';
        setTimeout(() => {
            statusBar.style.animation = 'pulse 0.5s';
        }, 10);
    }
    
    randomPlacement() {
        if (this.gameStarted) return;
        
        this.clearBoard();
        this.playerShips = [];
        
        this.ships.forEach(ship => {
            for (let i = 0; i < ship.count; i++) {
                let placed = false;
                let attempts = 0;
                
                while (!placed && attempts < 100) {
                    const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                    const row = Math.floor(Math.random() * this.gridSize);
                    const col = Math.floor(Math.random() * this.gridSize);
                    
                    if (this.canPlaceShip(row, col, ship.size, orientation)) {
                        this.placeRandomShip(row, col, ship.size, orientation, ship.name);
                        placed = true;
                    }
                    attempts++;
                }
            }
        });
        
        this.createShipSelector();
        this.updateStatus("Корабли расставлены случайно!");
        this.updateShipCounters();
        this.addLogMessage("Корабли расставлены случайным образом", "system");
    }
    
    canPlaceShip(row, col, size, orientation) {
        for (let i = 0; i < size; i++) {
            const r = orientation === 'horizontal' ? row : row + i;
            const c = orientation === 'horizontal' ? col + i : col;
            
            if (r >= this.gridSize || c >= this.gridSize) return false;
            
            // Проверяем соседние клетки
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                        const cell = document.querySelector(`#player-grid .cell[data-row="${nr}"][data-col="${nc}"]`);
                        if (cell && cell.classList.contains('ship')) {
                            return false;
                        }
                    }
                }
            }
        }
        return true;
    }
    
    placeRandomShip(row, col, size, orientation, name) {
        const cells = [];
        
        for (let i = 0; i < size; i++) {
            const r = orientation === 'horizontal' ? row : row + i;
            const c = orientation === 'horizontal' ? col + i : col;
            
            const cell = document.querySelector(`#player-grid .cell[data-row="${r}"][data-col="${c}"]`);
            cell.classList.add('ship');
            
            cells.push({ row: r, col: c });
        }
        
        this.playerShips.push({
            name: name,
            size: size,
            cells: cells,
            hits: 0
        });
    }
    
    clearBoard() {
        if (this.gameStarted) return;
        
        document.querySelectorAll('#player-grid .cell').forEach(cell => {
            cell.className = 'cell';
        });
        
        this.playerShips = [];
        this.createShipSelector();
        this.updateStatus("Поле очищено. Расставьте корабли");
        this.updateShipCounters();
        this.addLogMessage("Поле игрока очищено", "system");
    }
    
    startGame() {
        if (this.playerShips.length !== 10) {
            this.showError("Разместите все корабли перед началом игры!");
            return;
        }
        
        this.gameStarted = true;
        this.startTime = Date.now();
        this.setupBotShips();
        
        // Отключаем возможность кликать по своим кораблям
        document.querySelectorAll('#player-grid .cell').forEach(cell => {
            cell.style.cursor = 'default';
            cell.onclick = null;
        });
        
        this.updateStatus("Игра началась! Ваш ход");
        this.updateTurnIndicator(true);
        this.addLogMessage("=== ИГРА НАЧАЛАСЬ ===", "system");
        this.addLogMessage(`Уровень сложности: ${this.getDifficultyName()}`, "system");
        
        // Включаем звук моря громче
        this.audio.sea.volume = this.volume * 0.5;
    }
    
    updateTurnIndicator(playerTurn) {
        const indicator = document.querySelector('.turn-indicator');
        const dot = document.querySelector('.turn-dot');
        const text = document.getElementById('turn-text');
        
        if (playerTurn) {
            indicator.style.background = 'rgba(79, 195, 247, 0.2)';
            indicator.style.borderColor = '#4FC3F7';
            dot.style.background = '#4FC3F7';
            text.textContent = 'Ваш ход';
        } else {
            indicator.style.background = 'rgba(255, 107, 107, 0.2)';
            indicator.style.borderColor = '#FF6B6B';
            dot.style.background = '#FF6B6B';
            text.textContent = 'Ход противника';
        }
    }
    
    setupBotShips() {
        this.botShips = [];
        
        this.ships.forEach(ship => {
            for (let i = 0; i < ship.count; i++) {
                let placed = false;
                let attempts = 0;
                
                while (!placed && attempts < 100) {
                    const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                    const row = Math.floor(Math.random() * this.gridSize);
                    const col = Math.floor(Math.random() * this.gridSize);
                    
                    if (this.canPlaceBotShip(row, col, ship.size, orientation)) {
                        this.placeBotShip(row, col, ship.size, orientation, ship.name);
                        placed = true;
                    }
                    attempts++;
                }
            }
        });
        
        this.updateShipCounters();
    }
    
    canPlaceBotShip(row, col, size, orientation) {
        for (let i = 0; i < size; i++) {
            const r = orientation === 'horizontal' ? row : row + i;
            const c = orientation === 'horizontal' ? col + i : col;
            
            if (r >= this.gridSize || c >= this.gridSize) return false;
            
            // Проверяем соседние клетки
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    const nr = r + dr;
                    const nc = c + dc;
                    if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                        const existingShip = this.botShips.find(ship => 
                            ship.cells.some(cell => cell.row === nr && cell.col === nc)
                        );
                        if (existingShip) return false;
                    }
                }
            }
        }
        return true;
    }
    
    placeBotShip(row, col, size, orientation, name) {
        const cells = [];
        
        for (let i = 0; i < size; i++) {
            const r = orientation === 'horizontal' ? row : row + i;
            const c = orientation === 'horizontal' ? col + i : col;
            
            cells.push({ row: r, col: c });
        }
        
        this.botShips.push({
            name: name,
            size: size,
            cells: cells,
            hits: 0
        });
    }
    
    playerAttack(row, col) {
        if (!this.gameStarted) return;
        
        const cell = document.querySelector(`#bot-grid .cell[data-row="${row}"][data-col="${col}"]`);
        
        // Проверяем, не стреляли ли уже сюда
        if (cell.classList.contains('hit') || cell.classList.contains('miss')) {
            return;
        }
        
        this.playerShots++;
        let hit = false;
        let sunkShip = null;
        
        // Проигрываем звук выстрела
        this.playSound('shot');
        
        // Проверяем попадание
        for (const ship of this.botShips) {
            for (const shipCell of ship.cells) {
                if (shipCell.row === row && shipCell.col === col) {
                    hit = true;
                    this.playerSuccessfulShots++;
                    ship.hits++;
                    this.playerHits++;
                    
                    cell.classList.add('hit');
                    
                    // Проигрываем звук попадания
                    this.playSound('hit');
                    
                    // Проверяем, потоплен ли корабль
                    if (ship.hits === ship.size) {
                        sunkShip = ship;
                        // Помечаем все клетки корабля как потопленные
                        ship.cells.forEach(({ row, col }) => {
                            const sunkCell = document.querySelector(`#bot-grid .cell[data-row="${row}"][data-col="${col}"]`);
                            sunkCell.classList.add('sunk');
                        });
                        
                        // Проигрываем звук потопления
                        this.playSound('sunk');
                    }
                    
                    break;
                }
            }
            if (hit) break;
        }
        
        if (!hit) {
            cell.classList.add('miss');
            this.playSound('miss');
            this.addLogMessage(`Ваш выстрел в (${this.getCellName(row, col)}) - Промах!`, "player");
        } else if (sunkShip) {
            this.addLogMessage(`Ваш выстрел в (${this.getCellName(row, col)}) - Потоплен ${sunkShip.name}!`, "player");
        } else {
            this.addLogMessage(`Ваш выстрел в (${this.getCellName(row, col)}) - Попадание!`, "player");
        }
        
        this.updateHits();
        this.updateShipCounters();
        
        // Проверяем победу игрока
        if (this.checkWin(this.botShips)) {
            this.showWinModal(true);
            return;
        }
        
        // Если игрок попал, он ходит снова
        if (hit && !sunkShip) {
            this.updateStatus("Вы попали! Стреляйте снова");
            this.updateTurnIndicator(true);
            return;
        }
        
        // Ход бота
        this.updateStatus("Ход противника...");
        this.updateTurnIndicator(false);
        setTimeout(() => this.botAttack(), 1000);
    }
    
    getCellName(row, col) {
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
        return `${letters[col]}${row + 1}`;
    }
    
    botAttack() {
        let row, col;
        
        // Умный ИИ для бота
        if (this.difficulty === 'easy') {
            [row, col] = this.getRandomCell();
        } else if (this.difficulty === 'medium') {
            if (this.huntingMode && Math.random() > 0.3) {
                [row, col] = this.getSmartCell();
            } else {
                [row, col] = this.getRandomCell();
            }
        } else {
            [row, col] = this.getSmartCell();
        }
        
        const cell = document.querySelector(`#player-grid .cell[data-row="${row}"][data-col="${col}"]`);
        
        this.botShots++;
        let hit = false;
        let sunkShip = null;
        
        // Проигрываем звук выстрела
        this.playSound('shot');
        
        // Проверяем попадание
        for (const ship of this.playerShips) {
            for (const shipCell of ship.cells) {
                if (shipCell.row === row && shipCell.col === col) {
                    hit = true;
                    this.botSuccessfulShots++;
                    ship.hits++;
                    this.botHits++;
                    
                    cell.classList.add('hit');
                    
                    // Проигрываем звук попадания
                    this.playSound('hit');
                    
                    // Обновляем память бота для умного ИИ
                    if (this.difficulty !== 'easy') {
                        this.lastHit = { row, col };
                        this.botMemory.push({ row, col, hit: true });
                        this.huntingMode = true;
                        
                        // Добавляем возможные направления для добивания
                        if (!this.huntDirections.length) {
                            this.huntDirections = [
                                { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
                                { dr: 0, dc: 1 }, { dr: 0, dc: -1 }
                            ];
                        }
                    }
                    
                    // Проверяем, потоплен ли корабль
                    if (ship.hits === ship.size) {
                        sunkShip = ship;
                        // Помечаем все клетки корабля как потопленные
                        ship.cells.forEach(({ row, col }) => {
                            const sunkCell = document.querySelector(`#player-grid .cell[data-row="${row}"][data-col="${col}"]`);
                            sunkCell.classList.add('sunk');
                        });
                        
                        // Проигрываем звук потопления
                        this.playSound('sunk');
                        
                        // Сбрасываем режим охоты при потоплении корабля
                        if (this.difficulty !== 'easy') {
                            this.huntingMode = false;
                            this.lastHit = null;
                            this.huntDirections = [];
                        }
                    }
                    
                    break;
                }
            }
            if (hit) break;
        }
        
        if (!hit) {
            cell.classList.add('miss');
            this.playSound('miss');
            this.addLogMessage(`Противник стреляет в (${this.getCellName(row, col)}) - Промах!`, "bot");
            
            if (this.difficulty !== 'easy') {
                this.botMemory.push({ row, col, hit: false });
            }
        } else if (sunkShip) {
            this.addLogMessage(`Противник стреляет в (${this.getCellName(row, col)}) - Потоплен ваш ${sunkShip.name}!`, "bot");
        } else {
            this.addLogMessage(`Противник стреляет в (${this.getCellName(row, col)}) - Попадание по вашему кораблю!`, "bot");
        }
        
        this.updateHits();
        this.updateShipCounters();
        
        // Проверяем победу бота
        if (this.checkWin(this.playerShips)) {
            this.showWinModal(false);
            return;
        }
        
        // Если бот попал, он ходит снова (на среднем и сложном уровне)
        if (hit && !sunkShip && this.difficulty !== 'easy') {
            this.updateStatus("Противник попал! Он ходит снова...");
            this.updateTurnIndicator(false);
            setTimeout(() => this.botAttack(), 1000);
        } else {
            this.updateStatus("Ваш ход!");
            this.updateTurnIndicator(true);
        }
    }
    
    getRandomCell() {
        let row, col;
        let valid = false;
        let attempts = 0;
        
        while (!valid && attempts < 1000) {
            row = Math.floor(Math.random() * this.gridSize);
            col = Math.floor(Math.random() * this.gridSize);
            
            const cell = document.querySelector(`#player-grid .cell[data-row="${row}"][data-col="${col}"]`);
            if (!cell.classList.contains('hit') && !cell.classList.contains('miss')) {
                valid = true;
            }
            attempts++;
        }
        
        return [row, col];
    }
    
    getSmartCell() {
        // Если есть последнее попадание, стреляем вокруг него
        if (this.lastHit && this.huntDirections.length > 0) {
            // Пробуем все доступные направления
            while (this.huntDirections.length > 0) {
                const dir = this.huntDirections[Math.floor(Math.random() * this.huntDirections.length)];
                const newRow = this.lastHit.row + dir.dr;
                const newCol = this.lastHit.col + dir.dc;
                
                // Проверяем границы и нестрелянные клетки
                if (newRow >= 0 && newRow < this.gridSize && newCol >= 0 && newCol < this.gridSize) {
                    const cell = document.querySelector(`#player-grid .cell[data-row="${newRow}"][data-col="${newCol}"]`);
                    if (!cell.classList.contains('hit') && !cell.classList.contains('miss')) {
                        return [newRow, newCol];
                    }
                }
                
                // Удаляем неудачное направление
                const index = this.huntDirections.indexOf(dir);
                this.huntDirections.splice(index, 1);
            }
        }
        
        // Если умные ходы не сработали, стреляем случайно, но избегаем клеток рядом с промахами
        let attempts = 0;
        while (attempts < 100) {
            const [row, col] = this.getRandomCell();
            
            // Проверяем, что клетка не окружена промахами
            let goodCell = true;
            const directions = [[1,0], [-1,0], [0,1], [0,-1]];
            
            for (const [dr, dc] of directions) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                    const neighbor = document.querySelector(`#player-grid .cell[data-row="${nr}"][data-col="${nc}"]`);
                    if (neighbor.classList.contains('miss')) {
                        if (this.difficulty === 'medium' && Math.random() > 0.7) {
                            continue;
                        }
                        goodCell = false;
                        break;
                    }
                }
            }
            
            if (goodCell) {
                return [row, col];
            }
            
            attempts++;
        }
        
        // Если не нашли хорошую клетку, возвращаем случайную
        return this.getRandomCell();
    }
    
    checkWin(ships) {
        return ships.every(ship => ship.hits === ship.size);
    }
    
    updateStatus(message) {
        const statusElement = document.getElementById('status');
        statusElement.querySelector('span').textContent = message;
    }
    
    updateHits() {
        document.getElementById('player-hits').textContent = this.playerHits;
        document.getElementById('bot-hits').textContent = this.botHits;
    }
    
    updateShipCounters() {
        const playerAlive = this.playerShips.filter(ship => ship.hits < ship.size).length;
        const botAlive = this.botShips.filter(ship => ship.hits < ship.size).length;
        
        document.getElementById('player-ships').textContent = playerAlive;
        document.getElementById('player-counter').textContent = playerAlive;
        document.getElementById('bot-ships').textContent = botAlive;
        document.getElementById('bot-counter').textContent = botAlive;
    }
    
    addLogMessage(message, type) {
        const logContent = document.getElementById('log-content');
        const messageElement = document.createElement('div');
        messageElement.className = `log-entry ${type}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        messageElement.innerHTML = `
            <span class="time">[${time}]</span>
            <span class="message">${message}</span>
        `;
        
        logContent.appendChild(messageElement);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    clearLog() {
        const logContent = document.getElementById('log-content');
        logContent.innerHTML = '<div class="log-entry welcome"><span class="time">[Журнал очищен]</span><span class="message">Начните новую игру!</span></div>';
    }
    
    showWinModal(playerWon) {
        const modal = document.getElementById('win-modal');
        const title = document.getElementById('win-title');
        const message = document.getElementById('win-message');
        const trophy = document.getElementById('trophy-icon');
        
        // Останавливаем фоновую музыку
        this.audio.sea.pause();
        this.audio.sea.currentTime = 0;
        
        // Проигрываем звук победы или поражения
        if (playerWon) {
            this.playSound('win');
            title.textContent = "🎉 Победа!";
            message.textContent = "Вы одержали победу в морском сражении!";
            trophy.textContent = "🏆";
        } else {
            this.playSound('lose');
            title.textContent = "💀 Поражение";
            message.textContent = "Флот противника оказался сильнее...";
            trophy.textContent = "⚓";
        }
        
        // Обновляем статистику
        this.updateStats(playerWon);
        
        modal.style.display = 'flex';
        this.gameStarted = false;
    }
    
    updateStats(playerWon) {
        const accuracy = this.playerShots > 0 ? 
            Math.round((this.playerSuccessfulShots / this.playerShots) * 100) : 0;
        
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        document.getElementById('stat-shots').textContent = this.playerShots;
        document.getElementById('stat-accuracy').textContent = `${accuracy}%`;
        document.getElementById('stat-sunk').textContent = this.playerHits;
        document.getElementById('stat-time').textContent = timeString;
        
        // Оценка производительности
        const performanceFill = document.getElementById('performance-fill');
        const performanceText = document.getElementById('performance-text');
        
        let performance = 0;
        let text = "";
        
        if (playerWon) {
            if (this.playerShots <= 50) {
                performance = 100;
                text = "Идеальный результат!";
            } else if (this.playerShots <= 70) {
                performance = 80;
                text = "Отличная игра!";
            } else if (this.playerShots <= 90) {
                performance = 60;
                text = "Хороший результат";
            } else {
                performance = 40;
                text = "Можно лучше";
            }
        } else {
            performance = Math.min(30, accuracy);
            text = "Попробуйте еще раз!";
        }
        
        performanceFill.style.width = `${performance}%`;
        performanceText.textContent = text;
    }
    
    hideModal() {
        document.getElementById('win-modal').style.display = 'none';
        // Возобновляем фоновую музыку
        this.audio.sea.volume = this.volume * 0.3;
        this.audio.sea.play();
    }
    
    shareResult() {
        const stats = {
            shots: this.playerShots,
            accuracy: Math.round((this.playerSuccessfulShots / this.playerShots) * 100),
            sunk: this.playerHits,
            time: this.gameTime
        };
        
        const text = `Морской бой: ${stats.shots} выстрелов, точность ${stats.accuracy}%, потоплено ${stats.sunk} кораблей за ${Math.floor(stats.time/60)}:${(stats.time%60).toString().padStart(2,'0')}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Морской бой - Результат',
                text: text,
                url: window.location.href
            });
        } else {
            navigator.clipboard.writeText(text).then(() => {
                alert('Результат скопирован в буфер обмена!');
            });
        }
    }
    
    resetGame() {
        this.hideModal();
        
        // Сброс всех переменных
        this.playerShips = [];
        this.botShips = [];
        this.playerHits = 0;
        this.botHits = 0;
        this.gameStarted = false;
        this.currentShip = null;
        this.shipOrientation = 'horizontal';
        this.botMemory = [];
        this.lastHit = null;
        this.huntingMode = false;
        this.huntDirections = [];
        this.playerShots = 0;
        this.playerSuccessfulShots = 0;
        this.botShots = 0;
        this.botSuccessfulShots = 0;
        this.gameTime = 0;
        this.startTime = Date.now();
        
        // Очистка сеток
        this.createGrids();
        this.createShipSelector();
        this.updateStatus("Расставьте ваши корабли");
        this.updateHits();
        this.updateShipCounters();
        this.updateTurnIndicator(true);
        
        // Сброс ориентации
        document.getElementById('orientation').textContent = 'Горизонтальная';
        
        // Очистка лога (оставляем приветственное сообщение)
        this.clearLog();
        this.addLogMessage("Новая игра начата!", "system");
        
        // Возобновляем фоновую музыку
        this.audio.sea.volume = this.volume * 0.3;
        this.audio.sea.play();
    }
}

// Инициализация игры при полной загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    // Проверяем, поддерживается ли аудио
    const audioCheck = document.createElement('audio');
    const canPlay = !!audioCheck.canPlayType;
    
    if (!canPlay) {
        console.warn('Аудио не поддерживается в этом браузере');
    }
    
    // Запускаем игру
    window.game = new BattleshipGame();
    
    // Добавляем стили для анимации пульсации
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(255, 107, 107, 0); }
            100% { box-shadow: 0 0 0 0 rgba(255, 107, 107, 0); }
        }
    `;
    document.head.appendChild(style);
});
