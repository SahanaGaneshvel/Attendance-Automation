import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/console'

function App() {
  return (
    <Routes>
      <Route path="*" element={<AppShell />} />
    </Routes>
  )
}

export default App
