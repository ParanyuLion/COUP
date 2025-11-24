"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const router = useRouter();

  const handleJoin = (e) => {
    e.preventDefault();
    if (name && room) {
      router.push(`/game/${room}?name=${encodeURIComponent(name)}`);
    }
  };

  const createRoom = () => {
    const newRoom = Math.random().toString(36).substring(7);
    setRoom(newRoom);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-3xl font-bold mb-6 text-center text-yellow-500">COUP</h1>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-yellow-500 focus:outline-none"
              placeholder="Enter name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Room Code</label>
            <div className="flex gap-2">
                <input
                type="text"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full p-2 rounded bg-gray-700 border border-gray-600 focus:border-yellow-500 focus:outline-none"
                placeholder="Room code"
                required
                />
                <button
                    type="button"
                    onClick={createRoom}
                    className="px-3 py-2 bg-gray-600 rounded hover:bg-gray-500"
                    title="Generate Random Code"
                >
                    🎲
                </button>
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-yellow-600 hover:bg-yellow-500 rounded font-bold transition-colors"
          >
            Join Game
          </button>
        </form>
      </div>
    </div>
  );
}
