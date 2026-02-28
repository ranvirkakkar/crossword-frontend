import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../api';

const SLOT_LABELS = ['Morning', 'Midday', 'Evening'];
const cellSize = 100;
const padding = 3;
const boardSize = cellSize * 5;

const CrosswordGame = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [puzzles, setPuzzles] = useState([]);
    const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
    const [userInputsByPuzzle, setUserInputsByPuzzle] = useState({});
    const [completionByPuzzle, setCompletionByPuzzle] = useState({});
    const [timerByPuzzle, setTimerByPuzzle] = useState({});

    const [puzzle, setPuzzle] = useState(null);
    const [grid, setGrid] = useState([]);
    const [clues, setClues] = useState({ across: [], down: [] });
    const [clueNumberMap, setClueNumberMap] = useState({});

    const [userInput, setUserInput] = useState({});
    const [activeCell, setActiveCell] = useState({ row: 0, col: 0 });
    const [direction, setDirection] = useState('across');
    const [isPuzzleComplete, setIsPuzzleComplete] = useState(false);
    const [timer, setTimer] = useState(0);
    const [showCompletionModal, setShowCompletionModal] = useState(false);
    const [shake, setShake] = useState(false);
    const [incorrectCells, setIncorrectCells] = useState(new Set());
    const [showConfetti, setShowConfetti] = useState(false);

    const hiddenInputRef = useRef(null);

    const focusHiddenInput = useCallback(() => {
        const node = hiddenInputRef.current;
        if (!node || node.disabled) return;
        try {
            node.focus({ preventScroll: true });
        } catch (err) {
            node.focus();
        }
    }, []);

    const buildInitialInput = useCallback((gridData) => {
        const initial = {};
        gridData.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell !== '#') {
                    initial[`${r}-${c}`] = '';
                }
            });
        });
        return initial;
    }, []);

    const findFirstPlayableCell = useCallback((gridData) => {
        for (let r = 0; r < gridData.length; r += 1) {
            for (let c = 0; c < gridData[r].length; c += 1) {
                if (gridData[r][c] !== '#') {
                    return { row: r, col: c };
                }
            }
        }
        return { row: 0, col: 0 };
    }, []);

    const hydratePuzzleState = useCallback((index, list = puzzles, inputsMap = userInputsByPuzzle, completionMap = completionByPuzzle, timersMap = timerByPuzzle) => {
        const puzzleData = list[index];
        if (!puzzleData) {
            return;
        }

        setPuzzle(puzzleData);
        setGrid(puzzleData.grid);

        const storedInput = inputsMap[index] ?? buildInitialInput(puzzleData.grid);
        setUserInput(storedInput);

        const cluesObj = { across: [], down: [] };
        puzzleData.clues.forEach((clue) => {
            cluesObj[clue.direction].push(clue);
        });
        setClues(cluesObj);

        const numberMap = {};
        puzzleData.clues.forEach((clue) => {
            const key = `${clue.row}-${clue.col}`;
            if (numberMap[key] === undefined) {
                numberMap[key] = clue.number;
            }
        });
        setClueNumberMap(numberMap);

        setActiveCell(findFirstPlayableCell(puzzleData.grid));
        setDirection('across');
        setIsPuzzleComplete(Boolean(completionMap[index]));
        setShowCompletionModal(false);
        setShowConfetti(false);
        setIncorrectCells(new Set());
        setShake(false);
        setTimer(timersMap[index] ?? 0);
    }, [puzzles, userInputsByPuzzle, completionByPuzzle, timerByPuzzle, buildInitialInput, findFirstPlayableCell]);

    useEffect(() => {
        const fetchPuzzles = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await axios.get(buildApiUrl('/api/puzzles/daily'));
                const data = response.data;
                const puzzleList = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.puzzles)
                        ? data.puzzles
                        : [];

                if (!puzzleList.length) {
                    setPuzzles([]);
                    setUserInputsByPuzzle({});
                    setCompletionByPuzzle({});
                    setTimerByPuzzle({});
                    setCurrentPuzzleIndex(0);
                    setPuzzle(null);
                    setGrid([]);
                    setClues({ across: [], down: [] });
                    setClueNumberMap({});
                    setUserInput({});
                    setIsPuzzleComplete(false);
                    setTimer(0);
                    setError("No puzzles found for today.");
                    return;
                }

                const initialInputs = {};
                const initialCompletion = {};
                const initialTimers = {};

                puzzleList.forEach((pz, idx) => {
                    initialInputs[idx] = buildInitialInput(pz.grid);
                    initialCompletion[idx] = false;
                    initialTimers[idx] = 0;
                });

                setPuzzles(puzzleList);
                setUserInputsByPuzzle(initialInputs);
                setCompletionByPuzzle(initialCompletion);
                setTimerByPuzzle(initialTimers);
                setCurrentPuzzleIndex(0);
                hydratePuzzleState(0, puzzleList, initialInputs, initialCompletion, initialTimers);
            } catch (err) {
                console.error("Failed to fetch puzzle:", err);
                setError("Could not load the puzzle. Please try again later.");
                setPuzzles([]);
                setUserInputsByPuzzle({});
                setCompletionByPuzzle({});
                setTimerByPuzzle({});
                setCurrentPuzzleIndex(0);
                setPuzzle(null);
                setGrid([]);
                setClues({ across: [], down: [] });
                setClueNumberMap({});
                setUserInput({});
                setIsPuzzleComplete(false);
                setTimer(0);
            } finally {
                setLoading(false);
            }
        };
        fetchPuzzles();
    }, []);

    useEffect(() => {
        if (!puzzles.length) {
            return;
        }
        hydratePuzzleState(currentPuzzleIndex);
    }, [currentPuzzleIndex, puzzles]);

    useEffect(() => {
        if (loading || isPuzzleComplete) {
            return undefined;
        }
        const interval = setInterval(() => {
            setTimer((prev) => {
                const next = prev + 1;
                setTimerByPuzzle((prevMap) => ({
                    ...prevMap,
                    [currentPuzzleIndex]: next
                }));
                return next;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [loading, isPuzzleComplete, currentPuzzleIndex]);

    useEffect(() => {
        focusHiddenInput();
    }, [loading, activeCell, focusHiddenInput]);

    const checkPuzzle = useCallback(() => {
        if (!puzzle) return;
        let allCorrect = true;
        const incorrect = new Set();

        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                if (grid[r][c] !== '#') {
                    const userAnswer = (userInput[`${r}-${c}`] || '').toUpperCase();
                    const correctAnswer = grid[r][c].toUpperCase();
                    if (userAnswer !== correctAnswer) {
                        allCorrect = false;
                        incorrect.add(`${r}-${c}`);
                    }
                }
            }
        }

        if (allCorrect) {
            setIsPuzzleComplete(true);
            setCompletionByPuzzle((prev) => ({ ...prev, [currentPuzzleIndex]: true }));
            setShowConfetti(true);
            setShowCompletionModal(true);
            setTimeout(() => setShowConfetti(false), 4000);
        } else {
            setIncorrectCells(incorrect);
            setShake(true);
            setTimeout(() => {
                setShake(false);
                setIncorrectCells(new Set());
            }, 1000);
        }
    }, [puzzle, grid, userInput, currentPuzzleIndex]);

    const revealPuzzle = useCallback(() => {
        if (!puzzle || !grid) return;
        const revealed = {};
        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (cell !== '#') {
                    revealed[`${r}-${c}`] = cell;
                }
            });
        });
        setUserInput(revealed);
        setUserInputsByPuzzle((prev) => ({ ...prev, [currentPuzzleIndex]: revealed }));
        setIsPuzzleComplete(true);
        setCompletionByPuzzle((prev) => ({ ...prev, [currentPuzzleIndex]: true }));
    }, [puzzle, grid, currentPuzzleIndex]);

    const revealCell = useCallback(() => {
        if (!puzzle || !grid) return;
        const { row, col } = activeCell;
        const correctAnswer = grid[row]?.[col];
        if (correctAnswer && correctAnswer !== '#') {
            const updated = {
                ...userInput,
                [`${row}-${col}`]: correctAnswer
            };
            setUserInput(updated);
            setUserInputsByPuzzle((prev) => ({ ...prev, [currentPuzzleIndex]: updated }));
        }
    }, [puzzle, grid, activeCell, userInput, currentPuzzleIndex]);

    const handleCellClick = useCallback((row, col) => {
        if (grid[row]?.[col] === '#') return;
        let newDirection = direction;
        if (activeCell.row === row && activeCell.col === col) {
            newDirection = direction === 'across' ? 'down' : 'across';
        } else {
            newDirection = 'across';
        }
        setActiveCell({ row, col });
        setDirection(newDirection);
        focusHiddenInput();
    }, [grid, direction, activeCell, focusHiddenInput]);

    const getActiveClueData = useCallback(() => {
        if (!puzzle) return null;
        return clues[direction]?.find((c) => {
            if (direction === 'across') {
                return activeCell.row === c.row && activeCell.col >= c.col && activeCell.col < c.col + c.length;
            }
            return activeCell.col === c.col && activeCell.row >= c.row && activeCell.row < c.row + c.length;
        });
    }, [puzzle, clues, direction, activeCell]);

    const handleInputChange = useCallback((e) => {
        const value = e.target.value.toUpperCase();
        if (/^[A-Z]$/.test(value)) {
            const key = `${activeCell.row}-${activeCell.col}`;
            const updated = {
                ...userInput,
                [key]: value
            };
            setUserInput(updated);
            setUserInputsByPuzzle((prev) => ({ ...prev, [currentPuzzleIndex]: updated }));

            let { row: nextRow, col: nextCol } = activeCell;
            if (direction === 'across') {
                do { nextCol += 1; } while (grid[nextRow]?.[nextCol] === '#');
            } else {
                do { nextRow += 1; } while (grid[nextRow]?.[nextCol] === '#');
            }
            if (grid[nextRow]?.[nextCol]) {
                setActiveCell({ row: nextRow, col: nextCol });
            }
        }
        e.target.value = '';
    }, [activeCell, userInput, currentPuzzleIndex, grid, direction]);

    const handleKeyDown = useCallback((e) => {
        let { row, col } = activeCell;
        let newRow = row;
        let newCol = col;

        if (e.key.startsWith('Arrow')) {
            e.preventDefault();
            switch (e.key) {
                case 'ArrowUp': do { newRow -= 1; } while (grid[newRow]?.[newCol] === '#'); break;
                case 'ArrowDown': do { newRow += 1; } while (grid[newRow]?.[newCol] === '#'); break;
                case 'ArrowLeft': do { newCol -= 1; } while (grid[newRow]?.[newCol] === '#'); break;
                case 'ArrowRight': do { newCol += 1; } while (grid[newRow]?.[newCol] === '#'); break;
                default: break;
            }
            if (grid[newRow]?.[newCol]) {
                setActiveCell({ row: newRow, col: newCol });
            }
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            const currentCellKey = `${row}-${col}`;
            if ((userInput[currentCellKey] || '') === '') {
                if (direction === 'across') {
                    do { newCol -= 1; } while (grid[row]?.[newCol] === '#');
                } else {
                    do { newRow -= 1; } while (grid[newRow]?.[col] === '#');
                }
                if (grid[newRow]?.[newCol]) {
                    setActiveCell({ row: newRow, col: newCol });
                    const previousKey = `${newRow}-${newCol}`;
                    const updated = { ...userInput, [previousKey]: '' };
                    setUserInput(updated);
                    setUserInputsByPuzzle((prev) => ({ ...prev, [currentPuzzleIndex]: updated }));
                }
            } else {
                const updated = { ...userInput, [currentCellKey]: '' };
                setUserInput(updated);
                setUserInputsByPuzzle((prev) => ({ ...prev, [currentPuzzleIndex]: updated }));
            }
        }
    }, [activeCell, grid, userInput, direction, currentPuzzleIndex]);
    
    const generateGridPath = useCallback(() => {
        let path = '';
        for (let i = 1; i < 5; i++) {
            path += `M${i * cellSize},0 L${i * cellSize},${boardSize} `;
            path += `M0,${i * cellSize} L${boardSize},${i * cellSize} `;
        }
        return path;
    }, []);

    if (loading) {
        return <div className="st-game-error text-center my-16 mx-auto max-w-md">Server is waking up...</div>;
    }

    if (error) {
    return (
        <article className="st-game-article flex flex-col min-h-[500px]">
            <header className="st-article-header">
                <h2 className="st-article-title">Symmetric Mini Crossword</h2>
                <div className="st-article-tail" aria-hidden="true"></div>
            </header>

            <div className="flex-grow flex items-center justify-center">
                <div className="st-game-error text-center !text-red-600 font-bold leading-tight">
                    {error}
                </div>
            </div>
        </article>
    );
}

    const activeClueData = getActiveClueData();

    return (
        <article className="st-game-article">
            {showConfetti && (
                <div className="st-confetti-layer" aria-hidden="true">
                    {[...Array(50)].map((_, i) => (
                        <div
                            key={i}
                            className="st-confetti-piece animate-confetti"
                            style={{
                                left: `${Math.random() * 100}%`,
                                backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'][Math.floor(Math.random() * 6)],
                                animationDelay: `${Math.random() * 0.5}s`,
                                animationDuration: `${2 + Math.random() * 2}s`,
                                transform: `rotate(${Math.random() * 360}deg)`
                            }}
                        />
                    ))}
                </div>
            )}

            {showCompletionModal && (
                <div className="st-modal-overlay">
                    <div className="st-modal animate-modalSlideIn" role="dialog" aria-modal="true" aria-labelledby="puzzle-complete-title">
                        <div className="st-modal-emoji" aria-hidden="true">🎉</div>
                        <h2 id="puzzle-complete-title">Congratulations!</h2>
                        <h3> You won 🏆</h3>
                        <p>You solved the puzzle.</p>
                        <div className="st-modal-time" aria-label="Completion time">
                            {new Date(timer * 1000).toISOString().substr(14, 5)}
                        </div>
                        <button onClick={() => setShowCompletionModal(false)}>Close</button>
                    </div>
                </div>
            )}

            <input
                ref={hiddenInputRef}
                name="hidden-crossword-input"
                id="hidden-crossword-input"
                type="text"
                maxLength="1"
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={focusHiddenInput}
                style={{ position: 'fixed', top: 0, left: 0, width: '1px', height: '1px', opacity: 0, pointerEvents: 'none' }}
                disabled={isPuzzleComplete}
            />

            <header className="st-article-header">
                <h2 className="st-article-title">Symmetric Mini Crossword</h2>
                <div className="st-article-tail" aria-hidden="true"></div>
            </header>

            <section className="st-game-section">
                {puzzles.length > 1 && (
                    <div className="st-puzzle-switcher">
                        <span className="st-tool-label">Today's puzzles</span>
                        <div className="st-puzzle-switcher-buttons">
                            {puzzles.map((pz, idx) => {
                                const isActive = idx === currentPuzzleIndex;
                                const solved = Boolean(completionByPuzzle[idx]);
                                const label = pz?.slot !== undefined && SLOT_LABELS[pz.slot]
                                    ? SLOT_LABELS[pz.slot]
                                    : `Puzzle ${idx + 1}`;
                                return (
                                    <button
                                        key={pz._id ?? idx}
                                        className={`st-switcher-button${isActive ? ' is-active' : ''}${solved ? ' is-solved' : ''}`}
                                        onClick={() => {
                                            if (idx === currentPuzzleIndex) return;
                                            setTimerByPuzzle((prev) => ({ ...prev, [currentPuzzleIndex]: timer }));
                                            setCurrentPuzzleIndex(idx);
                                        }}
                                        disabled={isActive}
                                    >
                                        {label} {solved ? '✓' : ''}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="st-game-toolbar">
                    <span className="st-tool-label">Active clue</span>
                    <p>
                        <span className="st-clue-number">{activeClueData?.number}.</span>
                        {activeClueData?.clue || 'Select a clue to get started.'}
                    </p>
                    <div className="st-timer" aria-label="Elapsed time">
                        {new Date(timer * 1000).toISOString().substr(14, 5)}
                    </div>
                </div>

                <div className={`st-game-layout ${shake ? 'animate-shake' : ''}`}>
                    <div className="st-game-board">
                        <svg
                            viewBox={`-${padding} -${padding} ${boardSize + padding * 2} ${boardSize + padding * 2}`}
                            role="application"
                            aria-label="Crossword grid"
                        >
                            <g>
                                {grid.map((row, r) =>
                                    row.map((cell, c) => {
                                        if (cell === '#') {
                                            return (
                                                <rect
                                                    key={`${r}-${c}-black`}
                                                    x={c * cellSize}
                                                    y={r * cellSize}
                                                    width={cellSize}
                                                    height={cellSize}
                                                    fill="#121212"
                                                />
                                            );
                                        }
                                        const cellKey = `${r}-${c}`;
                                        const clueNumber = clueNumberMap[cellKey];
                                        const isActive = activeCell.row === r && activeCell.col === c;
                                        const isIncorrect = incorrectCells.has(cellKey);
                                        let isHighlighted = false;
                                        if (activeClueData) {
                                            if (direction === 'across' && activeClueData.row === r && c >= activeClueData.col && c < activeClueData.col + activeClueData.length) {
                                                isHighlighted = true;
                                            } else if (direction === 'down' && activeClueData.col === c && r >= activeClueData.row && r < activeClueData.row + activeClueData.length) {
                                                isHighlighted = true;
                                            }
                                        }

                                        return (
                                            <g key={cellKey} onClick={() => handleCellClick(r, c)}>
                                                <rect x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#ffffff" />
                                                {isHighlighted && !isActive && (
                                                    <rect x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#dbeafe" />
                                                )}
                                                {isActive && (
                                                    <rect x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#fde68a" />
                                                )}
                                                {isIncorrect && (
                                                    <rect x={c * cellSize} y={r * cellSize} width={cellSize} height={cellSize} fill="#fecaca" />
                                                )}
                                                {clueNumber !== undefined && (
                                                    <text
                                                        x={c * cellSize + 10}
                                                        y={r * cellSize + 28}
                                                        fontSize="26"
                                                        fill="#1f2937"
                                                        fontWeight="700"
                                                        textAnchor="start"
                                                        fontFamily="'Open Sans', sans-serif"
                                                        pointerEvents="none"
                                                    >
                                                        {clueNumber}
                                                    </text>
                                                )}
                                                <text
                                                    x={c * cellSize + cellSize / 2}
                                                    y={(r + 0.5) * cellSize}
                                                    fontSize="54"
                                                    fill="#111827"
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                    fontFamily="'Open Sans', sans-serif"
                                                    pointerEvents="none"
                                                >
                                                    {userInput[cellKey] || ''}
                                                </text>
                                            </g>
                                        );
                                    })
                                )}
                            </g>
                            <path d={generateGridPath()} stroke="#4b5563" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                            <rect x="0" y="0" width={boardSize} height={boardSize} fill="none" stroke="#111827" strokeWidth={padding * 2} />
                        </svg>
                    </div>

                    <div className="st-game-clues">
                        <div className="st-clue-column">
                            <h3>Across</h3>
                            <ul>
                                {clues.across
                                    .sort((a, b) => a.number - b.number)
                                    .map((clue) => (
                                        <li
                                            key={`across-${clue.number}`}
                                            onClick={() => {
                                                setActiveCell({ row: clue.row, col: clue.col });
                                                setDirection('across');
                                            }}
                                        >
                                            <span className="st-clue-index">{clue.number}.</span>
                                            {clue.clue}
                                        </li>
                                    ))}
                            </ul>
                        </div>
                        <div className="st-clue-column">
                            <h3>Down</h3>
                            <ul>
                                {clues.down
                                    .sort((a, b) => a.number - b.number)
                                    .map((clue) => (
                                        <li
                                            key={`down-${clue.number}`}
                                            onClick={() => {
                                                setActiveCell({ row: clue.row, col: clue.col });
                                                setDirection('down');
                                            }}
                                        >
                                            <span className="st-clue-index">{clue.number}.</span>
                                            {clue.clue}
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="st-game-actions">
                    <button onClick={checkPuzzle} disabled={isPuzzleComplete}>Check Puzzle</button>
                    <button onClick={revealCell} disabled={isPuzzleComplete}>Reveal Cell</button>
                    <button onClick={revealPuzzle} disabled={isPuzzleComplete}>Reveal Puzzle</button>
                </div>
            </section>
        </article>
    );
};

export default CrosswordGame;