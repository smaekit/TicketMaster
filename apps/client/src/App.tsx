import { Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<div>Login page</div>} />
      <Route path="/dashboard" element={<div>Dashboard</div>} />
      <Route path="/tickets" element={<div>Ticket list</div>} />
      <Route path="/tickets/:id" element={<div>Ticket detail</div>} />
      <Route path="/users" element={<div>User management</div>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
