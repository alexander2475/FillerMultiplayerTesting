const http = require('http').createServer();

const io = require('socket.io')(http, {
    cors: {origin: "*"}
});

//? Would it be better to just implement a flag indicating whether the game is over or not

class game {
	constructor(){
		this.masterColors = ['#ffc13d', '#c77dff', '#D1383B', '#238bf3', '#4f772d', '#003049'];
		this.availableColors = [...this.masterColors];
		this.players = [];
		this.playerColors = [];
		this.player1Captured = [];
		this.player2Captured = [];
		this.tileBoard = this.initTileBoard();
		this.mainBoard = this.initBoard();
		this.currentTurn = true;

	}

	initBoard(){
		let mainBoard =
		[
			['x', 'x', 'x', 'x', 'x', '1',],
			['x', 'x', 'x', 'x', 'x', 'x',],
			['x', 'x', 'x', 'x', 'x', 'x',],
			['2', 'x', 'x', 'x', 'x', 'x',]
		];

		mainBoard[0][5] = '1';
		mainBoard[3][0] = '2';

		return mainBoard;
	}

	//! need to add a condition that checks if both players have same color
	initTileBoard() {
		let tileBoard = [
			['x', 'x', 'x', 'x', 'x', 'x'],
			['x', 'x', 'x', 'x', 'x', 'x'],
			['x', 'x', 'x', 'x', 'x', 'x'],
			['x', 'x', 'x', 'x', 'x', 'x']
		];
	
		for (let row = 0; row < tileBoard.length; row++) {
			for (let col = 0; col < tileBoard[row].length; col++) {
				tileBoard[row][col] = this.assignColorForTile(tileBoard, row, col);
			}
		}
	
		let player1StartColor = this.assignColorForTile(tileBoard, 0, 5);
		let player2StartColor = this.assignColorForTile(tileBoard, 3, 0); 
	
		tileBoard[0][5] = player1StartColor; 
		tileBoard[3][0] = player2StartColor; 


		this.availableColors = this.availableColors.filter(c => c !== player1StartColor && c !== player2StartColor);
	
		return tileBoard;
	}
	

	assignColorForTile(board, row, col) {
		const availableColors = ['#ffc13d', '#c77dff', '#D1383B', '#238bf3', '#4f772d', '#003049'];
		let invalidColors = new Set();
	
		
		if (row > 0 && board[row - 1][col] !== null) invalidColors.add(board[row - 1][col]);
		if (row < board.length - 1 && board[row + 1][col] !== null) invalidColors.add(board[row + 1][col]);
		if (col > 0 && board[row][col - 1] !== null) invalidColors.add(board[row][col - 1]);
		if (col < board[row].length - 1 && board[row][col + 1] !== null) invalidColors.add(board[row][col + 1]);
	
		
		const validColors = availableColors.filter(color => !invalidColors.has(color));
		return validColors[Math.floor(Math.random() * validColors.length)];
	}

	//? Maybe we should assign a default value to the playerColors arr.
	addPlayer(playerID){
		if (this.players.length < 2) {
			this.players.push({
				id: playerID,
				playerNumber: this.players.length + 1,
			});
		}
	
		const playerNumber = this.players.length;
		console.log(`Player ${playerNumber} (ID: ${playerID}) has joined`);
	
		if (playerNumber === 1) {
			this.playerColors.push(this.tileBoard[0][5]);
			this.player1Captured.push(this.tileBoard[0][5]);
		} else if (playerNumber === 2) {
			this.playerColors.push(this.tileBoard[3][0]);
			this.player2Captured.push(this.tileBoard[3][0]);
		}
	}
	
	handleMove(playerID, color) {

		const currentPlayerIndex = this.currentTurn ? 0 : 1;
    	const currentPlayerID = this.players[currentPlayerIndex].id;

    	if (playerID !== currentPlayerID) {
        	console.log("Not the player's turn");
        	return;
    	}

		this.colorChosen(currentPlayerIndex, color);
		this.adjustBoard(color);
		this.currentTurn = !this.currentTurn;
		this.checkGameOver();
		this.broadcastGameState();
	}
	
	checkGameOver(){

		console.log('Server got to checkGameOver method');

		const boardWidth = 6;
		const boardHeight = 4;
		console.log(this.player1Captured.length);
		console.log(this.player2Captured.length);
		//TODO Need to check these conditions
		if (this.player1Captured.length + this.player2Captured.length == boardWidth * boardHeight){
			if (this.player1Captured.length > this.player2Captured.length){
				console.log('Player 1 won');
				io.emit('gameOver', "Player 1");
			} else if (this.player2Captured.length > this.player1Captured.length){
				console.log('Player 2 won');
				io.emit('gameOver', "Player 2");
			} else if (this.player1Captured.length === this.player2Captured.length){
				console.log('It was a draw');
				io.emit('gameOver', "It's a draw!");
			}
		}
	}

	broadcastGameState(){
		console.log('Server sending gameStateUpdate event');
		io.emit('gameStateUpdate', this.getGameState());
	}

	getGameState(){
		return {
			players: this.players,
			playerColors: this.playerColors,
			tileBoard: this.tileBoard,
			mainBoard: this.mainBoard,
			currnetTurn: this.currentTurn,
			availableColors: this.availableColors,
			player1Captured: this.player1Captured,
			player2Captured: this.player2Captured
		};
	}

	colorChosen(currentPlayerIndex, color){
		this.playerColors[currentPlayerIndex] = color;
		this.availableColors = this.masterColors.filter(c => !Object.values(this.playerColors).includes(c));
	}

	adjustBoard(color){

		let colorTarget = color;
	
		let boardHeight = 4;
		let boardWidth = 6;
	
		for(let i=0; i<boardHeight; i++) {
			for(let j = 0; j<boardWidth; j++) {
				if(this.currentTurn && this.mainBoard[i][j] === '1') {
					//check up
					if(i-1 >= 0 && colorTarget === this.tileBoard[i-1][j] && this.mainBoard[i-1][j] === "x") {
						this.mainBoard[i-1][j] ='1';
						this.player1Captured.push(this.tileBoard[i-1][j]);
					}
					//check down
					if(i+1 <this.tileBoard.length  && colorTarget === this.tileBoard[i+1][j] && this.mainBoard[i+1][j] === "x") {
						this.mainBoard[i+1][j] ='1';
						this.player1Captured.push(this.tileBoard[i+1][j]);
	
					}
					//check left
					if(j-1 >= 0 && colorTarget === this.tileBoard[i][j-1] && this.mainBoard[i][j-1] === "x") {
						this.mainBoard[i][j-1] ='1';
						this.player1Captured.push(this.tileBoard[i][j-1]);
	
					}
					//check right
					if(j+1 < this.tileBoard[i].length && colorTarget === this.tileBoard[i][j+1] && this.mainBoard[i][j+1] === "x") {
						this.mainBoard[i][j+1] ='1';
						this.player1Captured.push(this.tileBoard[i][j+1]);
	
					}
				}
	
				else if(!this.currentTurn && this.mainBoard[i][j] === '2') {
					//check up
					if(i-1 >= 0 && colorTarget === this.tileBoard[i-1][j] && this.mainBoard[i-1][j] === "x") {
						this.mainBoard[i-1][j] ='2';
						this.player2Captured.push(this.tileBoard[i-1][j]);
	
					}
					//check down
					if(i+1 <this.tileBoard.length  && colorTarget === this.tileBoard[i+1][j] && this.mainBoard[i+1][j] === "x") {
						this.mainBoard[i+1][j] ='2';
						this.player2Captured.push(this.tileBoard[i+1][j]);
	
					}
					//check left
					if(j-1 >= 0 && colorTarget === this.tileBoard[i][j-1] && this.mainBoard[i][j-1] === "x") {
						this.mainBoard[i][j-1] ='2';
						this.player2Captured.push(this.tileBoard[i][j-1]);
	
					}
					//check right
					if(j+1 < this.tileBoard[i].length && colorTarget === this.tileBoard[i][j+1] && this.mainBoard[i][j+1] === "x") {
						this.mainBoard[i][j+1] ='2';
						this.player2Captured.push(this.tileBoard[i][j+1]);
	
					}
				}
			}
		}
	}
}

const gameInstance = new game();

io.on('connection', (socket) => {
	console.log('A user connected', socket.id);
	gameInstance.addPlayer(socket.id);
	gameInstance.broadcastGameState();

	socket.on('move', (color) => {
		gameInstance.handleMove(socket.id, color);
		gameInstance.broadcastGameState();
	});

	socket.on('disconnect', () => {
		console.log('User disconnected', socket.id);
	});
});

http.listen(3000, () => {
	console.log('Server is running on port 3000');
});