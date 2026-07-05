import { Routes, Route } from 'react-router-dom'
import { DataProvider } from '@/contexts/DataContext'
import { AppShell } from '@/components/console'

function App() {
  return (
    <DataProvider>
      <Routes>
        <Route path="*" element={<AppShell />} />
      </Routes>
    </DataProvider>
  )
}

export default App
