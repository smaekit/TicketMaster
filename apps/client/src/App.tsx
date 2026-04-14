import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

function Dashboard() {
  const [health, setHealth] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(JSON.stringify(data)))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      {error && (
        <p className="text-red-500">API error: {error}</p>
      )}
      {health && (
        <p className="text-green-600">API health: {health}</p>
      )}
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<div className="p-8">Login page</div>} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/tickets" element={<div className="p-8">Ticket list</div>} />
      <Route path="/tickets/:id" element={<div className="p-8">Ticket detail</div>} />
      <Route path="/users" element={<div className="p-8">User management</div>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
