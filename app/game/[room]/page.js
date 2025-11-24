"use client";
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { getSocket } from '../../../lib/socket/client';

export default function Game() {
  const { room } = useParams();
  const searchParams = useSearchParams();
  const name = searchParams.get('name');
  const [gameState, setGameState] = useState(null);
  const [error, setError] = useState('');
  const [myId, setMyId] = useState('');
  const [targetingAction, setTargetingAction] = useState(null); // 'COUP', 'ASSASSINATE', 'STEAL'

  useEffect(() => {
    if (!room || !name) return;
    const socket = getSocket();
    
    socket.on('connect', () => {
        setMyId(socket.id);
        setTimeout(() => {
            socket.emit('join_room', { roomId: room, playerName: name });
        }, 200);
    });
    
    // If already connected
    if (socket.connected) {
        setMyId(socket.id);
        setTimeout(() => {
            socket.emit('join_room', { roomId: room, playerName: name });
        }, 200);
    } else {
        // socket.emit('join_room', { roomId: room, playerName: name }); // Removed immediate emit
    }

    socket.on('room_update', (data) => {
        setGameState(prev => ({ ...prev, ...data }));
    });

    socket.on('game_state_update', (data) => {
        setGameState(data);
    });
    
    socket.on('error', (msg) => setError(msg));

    return () => {
        socket.off('room_update');
        socket.off('game_state_update');
        socket.off('error');
        socket.off('connect');
    };
  }, [room, name]);

  const startGame = () => {
      getSocket().emit('start_game', { roomId: room });
  };

  const handleAction = (type) => {
      if (['COUP', 'ASSASSINATE', 'STEAL'].includes(type)) {
          setTargetingAction(type);
          return;
      }
      getSocket().emit('game_action', {
          roomId: room,
          action: { type }
      });
  };

  const handleTargetClick = (targetId) => {
      if (!targetingAction) return;
      getSocket().emit('game_action', {
          roomId: room,
          action: { type: targetingAction, target: targetId }
      });
      setTargetingAction(null);
  };

  const resolveCoup = (cardIndex) => {
      getSocket().emit('resolve_coup', { roomId: room, cardIndex });
  };

  const handleChallenge = () => {
      getSocket().emit('challenge', { roomId: room });
  };

  const handleBlock = (blockCard) => {
      getSocket().emit('block', { roomId: room, blockCard });
  };

  const handlePass = () => {
      getSocket().emit('pass_action', { roomId: room });
  };

  const handleExchange = (cardsToKeep) => {
      getSocket().emit('exchange_cards', { roomId: room, cardsToKeep });
  };

  if (error) return <div className="min-h-screen bg-gray-900 text-red-500 flex items-center justify-center">{error}</div>;
  if (!gameState) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

  const isMyTurn = gameState.currentPlayer === myId;
  const isActionPending = ['WAITING_FOR_CHALLENGE', 'WAITING_FOR_BLOCK', 'WAITING_FOR_BLOCK_CHALLENGE'].includes(gameState.status);
  const amIInvolved = isActionPending && gameState.currentAction?.source !== myId; // Simplified, logic depends on state
  
  // Determine if I can challenge/block
  let canReact = false;
  if (gameState.status === 'WAITING_FOR_CHALLENGE' && gameState.currentAction?.source !== myId) canReact = true;
  if (gameState.status === 'WAITING_FOR_BLOCK') {
      // Logic for who can block
      const action = gameState.currentAction;
      if (action.type === 'FOREIGN_AID' && action.source !== myId) canReact = true; // Anyone can block, except source
      if (['STEAL', 'ASSASSINATE'].includes(action.type) && action.target === myId) canReact = true;
  }
  if (gameState.status === 'WAITING_FOR_BLOCK_CHALLENGE' && gameState.currentAction?.blocker !== myId) canReact = true;


  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-yellow-500">Room: {room}</h1>
            <div className="text-sm bg-gray-800 px-3 py-1 rounded">Status: <span className="font-bold text-blue-400">{gameState.status}</span></div>
        </div>

        {/* Game Area */}
        {gameState.status === 'WAITING' ? (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <h2 className="text-2xl mb-6">Lobby</h2>
                <div className="bg-gray-800 p-6 rounded-lg w-96 mb-8">
                    <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Players ({gameState.players?.length || 0})</h3>
                    <ul className="space-y-2">
                        {gameState.players?.map(p => (
                            <li key={p.id} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                {p.name} {p.id === myId && '(You)'}
                            </li>
                        ))}
                    </ul>
                </div>
                {gameState.players?.length >= 2 ? (
                    <button onClick={startGame} className="bg-green-600 px-8 py-3 rounded-lg font-bold hover:bg-green-500 transition-colors shadow-lg">
                        Start Game
                    </button>
                ) : (
                    <div className="text-gray-400 animate-pulse">Waiting for more players...</div>
                )}
            </div>
        ) : (
            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Opponents Area */}
                <div className="md:col-span-12 flex justify-center gap-6 mb-4 flex-wrap">
                    {gameState.players?.filter(p => p.id !== myId).map(p => (
                        <div 
                            key={p.id} 
                            onClick={() => handleTargetClick(p.id)}
                            className={`bg-gray-800 p-4 rounded-lg border-2 w-48 transition-all 
                                ${p.id === gameState.currentPlayer ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 'border-gray-700'}
                                ${targetingAction ? 'cursor-pointer hover:border-red-500 hover:scale-105 animate-pulse' : ''}
                            `}
                        >
                            <div className="font-bold text-lg mb-2 truncate">{p.name}</div>
                            <div className="flex justify-between text-sm text-gray-300">
                                <span>💰 {p.coins}</span>
                                <span>🃏 {p.cardCount}</span>
                            </div>
                            {!p.isAlive && <div className="mt-2 text-red-500 text-center font-bold text-sm bg-red-900/20 py-1 rounded">ELIMINATED</div>}
                        </div>
                    ))}
                </div>

                {/* Game Info / Log */}
                <div className="md:col-span-12 bg-gray-800/50 rounded-lg p-4 mb-4 overflow-y-auto border border-gray-700 min-h-[100px]">
                    <div className="text-gray-400 text-center italic">
                        {targetingAction ? `Select a target for ${targetingAction}...` : 
                         gameState.status === 'WAITING_FOR_CARD_LOSS' && gameState.currentAction?.loser === myId ? 'Select a card to lose!' :
                         `Status: ${gameState.status}`}
                        {gameState.currentAction && (
                            <div className="mt-2 text-yellow-400">
                                Action: {gameState.currentAction.type} by {gameState.players.find(p => p.id === gameState.currentAction.source)?.name}
                                {gameState.currentAction.target && ` targeting ${gameState.players.find(p => p.id === gameState.currentAction.target)?.name}`}
                            </div>
                        )}
                    </div>
                    
                    {/* Reaction Buttons */}
                    {canReact && (
                        <div className="flex justify-center gap-4 mt-4">
                            {gameState.status === 'WAITING_FOR_CHALLENGE' && (
                                <button onClick={handleChallenge} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded font-bold">Challenge</button>
                            )}
                            {gameState.status === 'WAITING_FOR_BLOCK' && (
                                <>
                                    {gameState.currentAction.type === 'FOREIGN_AID' && <button onClick={() => handleBlock('Duke')} className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded font-bold">Block (Duke)</button>}
                                    {gameState.currentAction.type === 'STEAL' && (
                                        <>
                                            <button onClick={() => handleBlock('Captain')} className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-bold">Block (Captain)</button>
                                            <button onClick={() => handleBlock('Ambassador')} className="bg-green-600 hover:bg-green-500 px-6 py-2 rounded font-bold">Block (Ambassador)</button>
                                        </>
                                    )}
                                    {gameState.currentAction.type === 'ASSASSINATE' && <button onClick={() => handleBlock('Contessa')} className="bg-orange-600 hover:bg-orange-500 px-6 py-2 rounded font-bold">Block (Contessa)</button>}
                                </>
                            )}
                            {gameState.status === 'WAITING_FOR_BLOCK_CHALLENGE' && (
                                <button onClick={handleChallenge} className="bg-red-600 hover:bg-red-500 px-6 py-2 rounded font-bold">Challenge Block</button>
                            )}
                            <button onClick={handlePass} className="bg-gray-600 hover:bg-gray-500 px-6 py-2 rounded font-bold">Pass</button>
                        </div>
                    )}
                </div>

                {/* My Player Area */}
                <div className="md:col-span-12 bg-gray-800 p-6 rounded-xl border-t-4 border-blue-500 shadow-2xl">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-2xl font-bold">{name} (You)</h2>
                            <div className={`text-sm ${isMyTurn ? 'text-green-400 font-bold' : 'text-gray-400'}`}>
                                {isMyTurn ? "IT'S YOUR TURN" : "Waiting for opponent..."}
                            </div>
                        </div>
                        <div className="text-yellow-400 font-bold text-3xl bg-gray-900 px-4 py-2 rounded-lg border border-yellow-600/30">
                            💰 {gameState.coins}
                        </div>
                    </div>

                    {/* My Cards */}
                    <div className="flex justify-center gap-6 mb-8">
                        {gameState.hand?.map((card, i) => (
                            <div 
                                key={i} 
                                onClick={() => {
                                    if (gameState.status === 'WAITING_FOR_COUP_DECISION' && gameState.currentAction?.target === myId) resolveCoup(i);
                                    if (gameState.status === 'WAITING_FOR_CARD_LOSS' && gameState.currentAction?.loser === myId) resolveCoup(i); // Re-use resolveCoup for losing life
                                }}
                                className={`relative group perspective-1000 
                                    ${(gameState.status === 'WAITING_FOR_COUP_DECISION' && gameState.currentAction?.target === myId) || 
                                      (gameState.status === 'WAITING_FOR_CARD_LOSS' && gameState.currentAction?.loser === myId) 
                                      ? 'cursor-pointer hover:border-red-500 animate-bounce' : ''}
                                `}
                            >
                                <div className="bg-gradient-to-br from-gray-100 to-gray-300 text-black p-4 rounded-lg w-32 h-48 flex flex-col items-center justify-center font-bold shadow-xl border-4 border-white transform transition-transform hover:-translate-y-2">
                                    <div className="text-xs uppercase tracking-wider text-gray-500 mb-2">Character</div>
                                    <div className="text-xl text-center">{card}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    {/* Exchange UI */}
                    {gameState.status === 'WAITING_FOR_EXCHANGE' && gameState.currentAction?.source === myId && (
                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                            <div className="bg-gray-800 p-8 rounded-lg max-w-2xl w-full">
                                <h2 className="text-2xl font-bold mb-4 text-center">Exchange Cards</h2>
                                <p className="text-center mb-6 text-gray-400">Select 2 cards to keep.</p>
                                <ExchangeSelector hand={gameState.hand} onConfirm={handleExchange} />
                            </div>
                        </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-opacity duration-300 ${isMyTurn && !targetingAction && gameState.status === 'PLAYING' ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                        <button onClick={() => handleAction('INCOME')} className="bg-gray-700 hover:bg-gray-600 p-3 rounded font-medium border border-gray-600 hover:border-gray-500 transition-colors">
                            Income <span className="text-yellow-400 text-xs block">(+1 Coin)</span>
                        </button>
                        <button onClick={() => handleAction('FOREIGN_AID')} className="bg-gray-700 hover:bg-gray-600 p-3 rounded font-medium border border-gray-600 hover:border-gray-500 transition-colors">
                            Foreign Aid <span className="text-yellow-400 text-xs block">(+2 Coins)</span>
                        </button>
                        <button onClick={() => handleAction('COUP')} className="bg-red-900/80 hover:bg-red-800 p-3 rounded font-medium border border-red-700 hover:border-red-600 transition-colors text-red-100">
                            Coup <span className="text-yellow-400 text-xs block">(-7 Coins)</span>
                        </button>
                        <button onClick={() => handleAction('TAX')} className="bg-purple-900/80 hover:bg-purple-800 p-3 rounded font-medium border border-purple-700 hover:border-purple-600 transition-colors text-purple-100">
                            Tax <span className="text-gray-300 text-xs block">(Duke)</span>
                        </button>
                        <button onClick={() => handleAction('STEAL')} className="bg-blue-900/80 hover:bg-blue-800 p-3 rounded font-medium border border-blue-700 hover:border-blue-600 transition-colors text-blue-100">
                            Steal <span className="text-gray-300 text-xs block">(Captain)</span>
                        </button>
                        <button onClick={() => handleAction('EXCHANGE')} className="bg-green-900/80 hover:bg-green-800 p-3 rounded font-medium border border-green-700 hover:border-green-600 transition-colors text-green-100">
                            Exchange <span className="text-gray-300 text-xs block">(Ambassador)</span>
                        </button>
                        <button onClick={() => handleAction('ASSASSINATE')} className="bg-gray-700 hover:bg-gray-600 p-3 rounded font-medium border border-gray-600 hover:border-gray-500 transition-colors">
                            Assassinate <span className="text-yellow-400 text-xs block">(-3 Coins)</span>
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
}

function ExchangeSelector({ hand, onConfirm }) {
    const [selected, setSelected] = useState([]);

    const toggleCard = (index) => {
        if (selected.includes(index)) {
            setSelected(selected.filter(i => i !== index));
        } else {
            if (selected.length < 2) {
                setSelected([...selected, index]);
            }
        }
    };

    const confirm = () => {
        if (selected.length === 2) {
            const cardsToKeep = selected.map(i => hand[i]);
            onConfirm(cardsToKeep);
        }
    };

    return (
        <div className="flex flex-col items-center">
            <div className="flex gap-4 mb-6">
                {hand.map((card, i) => (
                    <div 
                        key={i}
                        onClick={() => toggleCard(i)}
                        className={`p-4 rounded-lg w-24 h-36 flex items-center justify-center font-bold cursor-pointer transition-all border-4 
                            ${selected.includes(i) ? 'border-green-500 scale-110 bg-green-900/30' : 'border-gray-600 bg-gray-700 hover:border-gray-500'}
                        `}
                    >
                        {card}
                    </div>
                ))}
            </div>
            <button 
                onClick={confirm} 
                disabled={selected.length !== 2}
                className={`px-8 py-3 rounded font-bold transition-colors ${selected.length === 2 ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 cursor-not-allowed'}`}
            >
                Confirm Selection
            </button>
        </div>
    );
}
