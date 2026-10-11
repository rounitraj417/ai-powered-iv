import { BrowserRouter, Route, Routes } from 'react-router'
import Login from './features/auth/pages/login.jsx'
import Register from './features/auth/pages/register.jsx'
import Protected from './features/auth/components/protected.jsx'
import Home from './features/Interview/pages/Home.jsx'
import Interview from './features/Interview/pages/interview.jsx'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Register />} />
        <Route path="/home" element={<Protected><Home /></Protected>} />
        <Route path="/interview/:interviewId" element={<Protected><Interview /></Protected>} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes