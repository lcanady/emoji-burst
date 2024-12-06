'use client';

import React, { useState, useEffect } from 'react';
import styles from './EmojiBurst.module.css';
import { sdk } from '@farcaster/frame-sdk';

// Game emojis
const EMOJIS = ['🍎', '🍇', '🍊', '🫐', '🍓', '🍑'];
const BOARD_SIZE = 8;
const GAME_DURATION_SECONDS = 60; // 1 minute game duration

interface GamePieceType {
  emoji: string;
  id: string;
}

type GameState = 'loading' | 'start' | 'playing' | 'gameOver';

let idCounter = 0;
const generateId = () => {
  idCounter += 1;
  return `${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function EmojiBurst() {
  const [board, setBoard] = useState<GamePieceType[][]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [selectedPiece, setSelectedPiece] = useState<{x: number, y: number} | null>(null);
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [gameState, setGameState] = useState<GameState>('loading');
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_SECONDS);

  // Initialize game state on client side only
  useEffect(() => {
    const savedHighScore = localStorage.getItem('emojiBurstHighScore');
    if (savedHighScore) {
      setHighScore(Number(savedHighScore));
    }
    initializeBoard();
    setGameState('start');
    sdk.actions.ready();
  }, []);

  
  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (gameState === 'playing' && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameState('gameOver');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [gameState, timeLeft]);

  // Update high score when current score exceeds it
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('emojiBurstHighScore', score.toString());
    }
  }, [score, highScore]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION_SECONDS);
    initializeBoard();
    setGameState('playing');
  };

  const initializeBoard = () => {
    let newBoard;
    let hasMatches;

    do {
      newBoard = Array(BOARD_SIZE).fill(null).map(() =>
        Array(BOARD_SIZE).fill(null).map(() => ({
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          id: generateId(),
        }))
      );
      hasMatches = checkInitialMatches(newBoard);
    } while (hasMatches);

    setBoard(newBoard);
  };

  const checkInitialMatches = (board: GamePieceType[][]) => {
    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        if (
          board[row][col].emoji === board[row][col + 1].emoji &&
          board[row][col].emoji === board[row][col + 2].emoji
        ) {
          return true;
        }
      }
    }

    // Check vertical matches
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (
          board[row][col].emoji === board[row + 1][col].emoji &&
          board[row][col].emoji === board[row + 2][col].emoji
        ) {
          return true;
        }
      }
    }

    return false;
  };

  const handlePieceClick = (row: number, col: number) => {
    if (!selectedPiece) {
      setSelectedPiece({ x: col, y: row });
    } else {
      // Check if adjacent
      const isAdjacent = (
        Math.abs(selectedPiece.x - col) + Math.abs(selectedPiece.y - row) === 1
      );

      if (isAdjacent) {
        swapPieces(selectedPiece.y, selectedPiece.x, row, col);
      }
      setSelectedPiece(null);
    }
  };

  const swapPieces = (row1: number, col1: number, row2: number, col2: number) => {
    const newBoard = [...board];
    const temp = newBoard[row1][col1];
    newBoard[row1][col1] = newBoard[row2][col2];
    newBoard[row2][col2] = temp;
    setBoard(newBoard);
    
    // Check for matches after swap
    if (!checkMatches()) {
      // If no matches, swap back
      setTimeout(() => {
        const revertBoard = [...newBoard];
        const piece1 = revertBoard[row1][col1];
        const piece2 = revertBoard[row2][col2];
        revertBoard[row1][col1] = piece2;
        revertBoard[row2][col2] = piece1;
        setBoard(revertBoard);
      }, 300);
    }
  };

  const checkForPossibleMoves = () => {
    // Check horizontally
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 1; col++) {
        // Try swapping with right piece
        const tempBoard = board.map(row => [...row]);
        const temp = tempBoard[row][col];
        tempBoard[row][col] = tempBoard[row][col + 1];
        tempBoard[row][col + 1] = temp;
        
        if (hasMatches(tempBoard)) return true;
      }
    }
    
    // Check vertically
    for (let row = 0; row < BOARD_SIZE - 1; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        // Try swapping with bottom piece
        const tempBoard = board.map(row => [...row]);
        const temp = tempBoard[row][col];
        tempBoard[row][col] = tempBoard[row + 1][col];
        tempBoard[row + 1][col] = temp;
        
        if (hasMatches(tempBoard)) return true;
      }
    }
    
    return false;
  };

  const hasMatches = (board: GamePieceType[][]) => {
    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        if (
          board[row][col].emoji === board[row][col + 1].emoji &&
          board[row][col].emoji === board[row][col + 2].emoji
        ) {
          return true;
        }
      }
    }

    // Check vertical matches
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (
          board[row][col].emoji === board[row + 1][col].emoji &&
          board[row][col].emoji === board[row + 2][col].emoji
        ) {
          return true;
        }
      }
    }

    return false;
  };

  const checkMatches = () => {
    const matches = new Set<string>();
    
    // Check horizontal matches
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE - 2; col++) {
        if (
          board[row][col].emoji === board[row][col + 1].emoji &&
          board[row][col].emoji === board[row][col + 2].emoji
        ) {
          matches.add(`${row},${col}`);
          matches.add(`${row},${col + 1}`);
          matches.add(`${row},${col + 2}`);
        }
      }
    }

    // Check vertical matches
    for (let row = 0; row < BOARD_SIZE - 2; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (
          board[row][col].emoji === board[row + 1][col].emoji &&
          board[row][col].emoji === board[row + 2][col].emoji
        ) {
          matches.add(`${row},${col}`);
          matches.add(`${row + 1},${col}`);
          matches.add(`${row + 2},${col}`);
        }
      }
    }

    if (matches.size > 0) {
      removeMatches(matches);
      setScore(prev => prev + matches.size * 10);
    } else if (!checkForPossibleMoves()) {
      setGameState('gameOver');
    }

    return matches.size > 0;
  };

  const removeMatches = (matches: Set<string>) => {
    const newBoard = [...board];
    
    // Remove matched pieces
    matches.forEach(match => {
      const [row, col] = match.split(',').map(Number);
      newBoard[row][col] = {
        emoji: '💥', // Explosion animation
        id: generateId(),
      };
    });

    setBoard(newBoard);

    // After a brief animation, drop new pieces
    setTimeout(() => {
      dropPieces(matches);
    }, 200);
  };

  const dropPieces = (matches: Set<string>) => {
    const newBoard = [...board];
    const columns = new Set([...matches].map(match => Number(match.split(',')[1])));

    columns.forEach(col => {
      let emptyCount = 0;
      for (let row = BOARD_SIZE - 1; row >= 0; row--) {
        if (matches.has(`${row},${col}`)) {
          emptyCount++;
        } else if (emptyCount > 0) {
          newBoard[row + emptyCount][col] = newBoard[row][col];
        }
      }

      for (let row = 0; row < emptyCount; row++) {
        newBoard[row][col] = {
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
          id: generateId(),
        };
      }
    });

    setBoard(newBoard);

    setTimeout(() => {
      if (checkMatches()) {
        // Continue chain reaction if new matches are found
      }
    }, 300);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>, row: number, col: number) => {
    event.preventDefault();
    setTouchStart({ x: col, y: row });
    setSelectedPiece({ x: col, y: row });
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStart || !selectedPiece) return;

    const touch = event.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement;
    const pieceElement = element?.closest('[data-row]');
    
    if (pieceElement) {
      const row = parseInt(pieceElement.getAttribute('data-row') || '0');
      const col = parseInt(pieceElement.getAttribute('data-col') || '0');
      
      if (row !== touchStart.y || col !== touchStart.x) {
        const isAdjacent = Math.abs(touchStart.x - col) + Math.abs(touchStart.y - row) === 1;
        
        if (isAdjacent) {
          swapPieces(touchStart.y, touchStart.x, row, col);
          setTouchStart(null);
          setSelectedPiece(null);
        }
      }
    }
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
    setSelectedPiece(null);
  };

  if (gameState === 'loading') {
    return (
      <div className={styles.gameContainer}>
        <div className={styles.gameScreen}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (gameState === 'start') {
    return (
      <div className={styles.gameContainer}>
        <div className={styles.gameScreen}>
          <h1>Emoji Burst! 💥</h1>
          <p>Match 3 or more emojis to score points</p>
          {highScore > 0 && <p>High Score: {highScore}</p>}
          <button className={styles.button} onClick={startGame}>Start Game</button>
        </div>
      </div>
    );
  }

  if (gameState === 'gameOver') {
    return (
      <div className={styles.gameContainer}>
        <div className={styles.gameScreen}>
          <h1>Game Over! 🎮</h1>
          <p>Final Score: {score}</p>
          <p>High Score: {highScore}</p>
          {score === highScore && <p>🎉 New High Score! 🎉</p>}
          <button className={styles.button} onClick={startGame}>Play Again</button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing') {
    return (
      <div className={styles.gameContainer}>
        <h1>Emoji Burst! 💥</h1>
        <div className={`${styles.timer} ${timeLeft <= 10 ? styles.timerLow : ''}`}>
          {timeLeft}s
        </div>
        <div className={styles.scoreContainer}>
          <div>Score: {score}</div>
          <div>Best: {highScore}</div>
        </div>
        <div className={styles.gameBoard}>
          {board.map((row, rowIndex) => (
            row.map((piece, colIndex) => (
              <div
                key={piece.id}
                className={`${styles.gamePiece} ${selectedPiece?.x === colIndex && selectedPiece?.y === rowIndex ? styles.selected : ''}`}
                onClick={() => handlePieceClick(rowIndex, colIndex)}
                onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                data-row={rowIndex}
                data-col={colIndex}
              >
                {piece.emoji}
              </div>
            ))
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.gameContainer}>
      <div className={styles.gameScreen}>
        <h1>Loading...</h1>
      </div>
    </div>
  );
} 