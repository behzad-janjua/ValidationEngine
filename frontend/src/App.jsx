import { HashRouter, Routes, Route } from 'react-router-dom'
import Agent1Page from './pages/Agent1Page'
import Agent2Page from './pages/Agent2Page'
import Agent3Page from './pages/Agent3Page'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Agent1Page />} />
        <Route path="/agent2" element={<Agent2Page />} />
        <Route path="/agent3" element={<Agent3Page />} />
      </Routes>
    </HashRouter>
  )
}
