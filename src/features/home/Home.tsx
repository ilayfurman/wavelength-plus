import { useState, type FormEvent } from 'react'

export function Home({ onCreate, onJoin }: { onCreate: () => void; onJoin: (roomCode: string) => void }) {
  const [roomCode, setRoomCode] = useState('')

  function submitJoin(e: FormEvent) {
    e.preventDefault()
    onJoin(roomCode.toUpperCase())
  }

  return (
    <div>
      <h1>Wavelength Plus</h1>
      <button onClick={onCreate}>Create party</button>
      <form onSubmit={submitJoin}>
        <label htmlFor="room-code">Room code</label>
        <input id="room-code" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} maxLength={4} required />
        <button type="submit">Join party</button>
      </form>
    </div>
  )
}
