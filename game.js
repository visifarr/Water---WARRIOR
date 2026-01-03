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
        
        this.init();
    }
    
    init() {
        this.createGrids();
        this.setupEventListeners();
        this.createShipSelector();
        this.updateStatus("Расставьте ваши корабли на поле");
    }
    
    createGrids() {
        const playerGrid = document.getElementById('player-grid');
        const botGrid = document.getElementById('bot-grid');
        
        playerGrid.innerHTML = '';
        botGrid.innerHTML = '';
        
        for (let row = 0; row < this.gridSize; row++) {
            for (let col = 0; col < this.gridSize; col++) {
                // Игровое поле игрока
                const playerCell = document.createElement('div');
                playerCell.className = 'cell';
                playerCell.dataset.row = row;
                playerCell.dataset.col = col;
                playerCell.addEventListener('click', () => this.placeShip(row, col));
                playerGrid.appendChild(playerCell);
                
                // Игровое поле бота
                const botCell = document.createElement('div');
                botCell.className = 'cell';
                botCell.dataset.row = row;
                botCell.dataset.col = col;
                botCell.addEventListener('click', () => this.playerAttack(row, col));
                botGrid.appendChild(botCell);
            }
        }
    }
    
    createShipSelector() {
        const container = document.getElementById('ships-to-place');
        container.innerHTML = '';
        
        this.ships.forEach(ship => {
            for (let i = 0; i < ship.count; i++) {
                const shipElement = document.createElement('div');
                shipElement.className = 'ship-to-place';
                shipElement.dataset.size = ship.size;
                shipElement.dataset.name = ship.name;
                shipElement.innerHTML = Array(ship.size).fill('<div class="ship-part"></div>').join('');
                
                shipElement.addEventListener('click', () => {
                    this.currentShip = {
                        size: ship.size,
                        name: ship.name,
                        element: shipElement
                    };
                    document.querySelectorAll('.ship-to-place').forEach(s => s.style.opacity = '0.5');
                    shipElement.style.opacity = '1';
                    shipElement.style.border = '2px solid #4caf50';
                });
                
                container.appendChild(shipElement);
            }
        });
    }
    
    setupEventListeners() {
        document.getElementById('start-game').addEventListener('click', () => this.startGame());
        document.getElementById('random-ships').addEventListener('click', () => this.randomPlacement());
        document.getElementById('rotate-ship').addEventListener('click', () => this.rotateShip());
        document.getElementById('clear-board').addEventListener('click', () => this.clearBoard());
        document.getElementById('difficulty').addEventListener('change', (e) => this.difficulty = e.target.value);
        document.getElementById('play-again').addEventListener('click', () => this.resetGame());
        
        // Показываем первый корабль для размещения
        setTimeout(() => {
            const firstShip = document.querySelector('.ship-to-place');
            if (firstShip) firstShip.click();
        }, 100);
    }
    
    rotateShip() {
        this.shipOrientation = this.shipOrientation === 'horizontal' ? 'vertical' : 'horizontal';
        document.getElementById('rotate-ship').innerHTML = 
            `<i class="fas fa-rotate"></i> ${this.shipOrientation === 'horizontal' ? 'Горизонтально' : 'Вертикально'}`;
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
            this.updateStatus("Нельзя разместить корабль здесь!");
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
        const nextShip = document.querySelector('.ship-to-place');
        if (nextShip) {
            nextShip.click();
            this.updateStatus(`Разместите ${this.currentShip.name} (${this.currentShip.size} палуб)`);
        } else {
            this.currentShip = null;
            this.updateStatus("Все корабли размещены! Нажмите 'Начать игру'");
        }
        
        this.updateShipCounters();
    }
    
    randomPlacement() {
        if (this.gameStarted) return;
        
        this.clearBoard();
        this.playerShips = [];
        
        this.ships.forEach(ship => {
            for (let i = 0; i < ship.count; i++) {
                let placed = false;
                
                while (!placed) {
                    const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                    const row = Math.floor(Math.random() * this.gridSize);
                    const col = Math.floor(Math.random() * this.gridSize);
                    
                    if (this.canPlaceShip(row, col, ship.size, orientation)) {
                        this.placeRandomShip(row, col, ship.size, orientation, ship.name);
                        placed = true;
                    }
                }
            }
        });
        
        this.createShipSelector();
        this.updateStatus("Корабли расставлены случайно!");
        this.updateShipCounters();
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
    }
    
    startGame() {
        if (this.playerShips.length !== 10) {
            this.updateStatus("Разместите все корабли перед началом игры!");
            return;
        }
        
        this.gameStarted = true;
        this.setupBotShips();
        
        // Отключаем возможность кликать по своим кораблям
        document.querySelectorAll('#player-grid .cell').forEach(cell => {
            cell.style.cursor = 'default';
            cell.onclick = null;
        });
        
        this.updateStatus("Игра началась! Ваш ход");
        this.addLogMessage("Игра началась!", "system");
    }
    
    setupBotShips() {
        this.botShips = [];
        
        this.ships.forEach(ship => {
            for (let i = 0; i < ship.count; i++) {
                let placed = false;
                
                while (!placed) {
                    const orientation = Math.random() > 0.5 ? 'horizontal' : 'vertical';
                    const row = Math.floor(Math.random() * this.gridSize);
                    const col = Math.floor(Math.random() * this.gridSize);
                    
                    if (this.canPlaceBotShip(row, col, ship.size, orientation)) {
                        this.placeBotShip(row, col, ship.size, orientation, ship.name);
                        placed = true;
                    }
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
        
        let hit = false;
        let sunkShip = null;
        
        // Проверяем попадание
        for (const ship of this.botShips) {
            for (const shipCell of ship.cells) {
                if (shipCell.row === row && shipCell.col === col) {
                    hit = true;
                    ship.hits++;
                    this.playerHits++;
                    
                    cell.classList.add('hit');
                    
                    // Проверяем, потоплен ли корабль
                    if (ship.hits === ship.size) {
                        sunkShip = ship;
                        // Помечаем все клетки корабля как потопленные
                        ship.cells.forEach(({ row, col }) => {
                            const sunkCell = document.querySelector(`#bot-grid .cell[data-row="${row}"][data-col="${col}"]`);
                            sunkCell.classList.add('sunk');
                        });
                    }
                    
                    break;
                }
            }
            if (hit) break;
        }
        
        if (!hit) {
            cell.classList.add('miss');
            this.addLogMessage(`Вы стреляете в (${row+1}, ${col+1}) - Промах!`, "player");
        } else if (sunkShip) {
            this.addLogMessage(`Вы стреляете в (${row+1}, ${col+1}) - Потоплен ${sunkShip.name}!`, "player");
        } else {
            this.addLogMessage(`Вы стреляете в (${row+1}, ${col+1}) - Попадание!`, "player");
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
            return;
        }
        
        // Ход бота
        this.updateStatus("Ход противника...");
        setTimeout(() => this.botAttack(), 800);
    }
    
    botAttack() {
        let row, col;
        let validCell = false;
        
        // Умный ИИ для бота
        if (this.difficulty === 'easy') {
            // Легкий уровень - случайные выстрелы
            [row, col] = this.getRandomCell();
        } else if (this.difficulty === 'medium') {
            // Средний уровень - иногда целенаправленно стреляет
            if (this.huntingMode && Math.random() > 0.3) {
                [row, col] = this.getSmartCell();
            } else {
                [row, col] = this.getRandomCell();
            }
        } else {
            // Сложный уровень - умная стратегия
            [row, col] = this.getSmartCell();
        }
        
        const cell = document.querySelector(`#player-grid .cell[data-row="${row}"][data-col="${col}"]`);
        
        let hit = false;
        let sunkShip = null;
        
        // Проверяем попадание
        for (const ship of this.playerShips) {
            for (const shipCell of ship.cells) {
                if (shipCell.row === row && shipCell.col === col) {
                    hit = true;
                    ship.hits++;
                    this.botHits++;
                    
                    cell.classList.add('hit');
                    
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
            this.addLogMessage(`Противник стреляет в (${row+1}, ${col+1}) - Промах!`, "bot");
            
            if (this.difficulty !== 'easy') {
                this.botMemory.push({ row, col, hit: false });
            }
        } else if (sunkShip) {
            this.addLogMessage(`Противник стреляет в (${row+1}, ${col+1}) - Потоплен ваш ${sunkShip.name}!`, "bot");
        } else {
            this.addLogMessage(`Противник стреляет в (${row+1}, ${col+1}) - Попадание по вашему кораблю!`, "bot");
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
            setTimeout(() => this.botAttack(), 800);
        } else {
            this.updateStatus("Ваш ход!");
        }
    }
    
    getRandomCell() {
        let row, col;
        let valid = false;
        
        while (!valid) {
            row = Math.floor(Math.random() * this.gridSize);
            col = Math.floor(Math.random() * this.gridSize);
            
            const cell = document.querySelector(`#player-grid .cell[data-row="${row}"][data-col="${col}"]`);
            if (!cell.classList.contains('hit') && !cell.classList.contains('miss')) {
                valid = true;
            }
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
            
            // Проверяем, что клетка не окружена промахами (эффект "креста")
            let goodCell = true;
            const directions = [[1,0], [-1,0], [0,1], [0,-1]];
            
            for (const [dr, dc] of directions) {
                const nr = row + dr;
                const nc = col + dc;
                if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
                    const neighbor = document.querySelector(`#player-grid .cell[data-row="${nr}"][data-col="${nc}"]`);
                    if (neighbor.classList.contains('miss')) {
                        // На среднем уровне иногда игнорируем это правило
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
        document.getElementById('status').textContent = message;
    }
    
    updateHits() {
        document.getElementById('player-hits').textContent = this.playerHits;
        document.getElementById('bot-hits').textContent = this.botHits;
    }
    
    updateShipCounters() {
        const playerAlive = this.playerShips.filter(ship => ship.hits < ship.size).length;
        const botAlive = this.botShips.filter(ship => ship.hits < ship.size).length;
        
        document.getElementById('player-ships').textContent = `${playerAlive}/10`;
        document.getElementById('bot-ships').textContent = `${botAlive}/10`;
    }
    
    addLogMessage(message, type) {
        const logContent = document.getElementById('log-content');
        const messageElement = document.createElement('div');
        messageElement.className = `log-message ${type}`;
        messageElement.textContent = `[${new Date().toLocaleTimeString().slice(0,5)}] ${message}`;
        
        logContent.appendChild(messageElement);
        logContent.scrollTop = logContent.scrollHeight;
    }
    
    showWinModal(playerWon) {
        const modal = document.getElementById('win-modal');
        const title = document.getElementById('win-title');
        const message = document.getElementById('win-message');
        
        if (playerWon) {
            title.textContent = "🎉 Победа!";
            message.textContent = `Вы победили бота за ${this.playerHits} попаданий!`;
            title.style.color = "#4caf50";
        } else {
            title.textContent = "💀 Поражение";
            message.textContent = `Бот победил вас за ${this.botHits} попаданий!`;
            title.style.color = "#ff5252";
        }
        
        modal.style.display = 'flex';
        this.gameStarted = false;
    }
    
    resetGame() {
        document.getElementById('win-modal').style.display = 'none';
        
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
        
        // Очистка сеток
        this.createGrids();
        this.createShipSelector();
        this.updateStatus("Расставьте ваши корабли");
        this.updateHits();
        this.updateShipCounters();
        
        // Очистка лога
        document.getElementById('log-content').innerHTML = '';
        
        // Сброс кнопки поворота
        document.getElementById('rotate-ship').innerHTML = '<i class="fas fa-rotate"></i> Повернуть корабль';
    }
}

// Инициализация игры при загрузке страницы
window.addEventListener('DOMContentLoaded', () => {
    window.game = new BattleshipGame();
});
