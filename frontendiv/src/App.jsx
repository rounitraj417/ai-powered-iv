import AppRoutes from './app.routes.jsx'
import { AuthProvider } from './features/auth/authcontext.jsx'
import { InterviewProvider } from './features/Interview/interrviewProvider.jsx'

function App() {
  return (
    <AuthProvider>
      <InterviewProvider>
        <AppRoutes />
      </InterviewProvider>
    </AuthProvider>
  )
}

export default App
