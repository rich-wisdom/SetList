import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthProvider from './components/AuthProvider';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import CompleteProfile from './pages/CompleteProfile';
import Profile from './pages/Profile';
import Forum from './pages/Forum';
import Messages from './pages/Messages';
import PrivateRoute from './components/PrivateRoute';
import Search from './pages/Search';
import UserProfile from './pages/UserProfile';
import Notifications from './pages/Notifications';
import { Container } from 'react-bootstrap';
import './styles/darkMode.css';
import { useDarkMode } from './hooks/useDarkMode';

function App() {
  useDarkMode();
  
  return (
    <Router>
      <AuthProvider>
        <Navbar />
        <Container fluid className="py-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/complete-profile" 
              element={
                <PrivateRoute>
                  <CompleteProfile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/profile/:userId" 
              element={
                <PrivateRoute>
                  <UserProfile />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/forum" 
              element={
                <PrivateRoute>
                  <Forum />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/messages" 
              element={
                <PrivateRoute>
                  <Messages />
                </PrivateRoute>
              } 
            />
            <Route path="/search" element={<Search />} />
            <Route 
              path="/notifications" 
              element={
                <PrivateRoute>
                  <Notifications />
                </PrivateRoute>
              } 
            />
          </Routes>
        </Container>
      </AuthProvider>
    </Router>
  );
}

export default App; 
