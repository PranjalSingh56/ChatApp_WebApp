import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import { SocketProvider } from './context/SocketContext';

const App = () => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user'));

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!token ? <Auth type="login" /> : <Navigate to="/" />}
        />
        <Route
          path="/signup"
          element={!token ? <Auth type="signup" /> : <Navigate to="/" />}
        />
        <Route
          path="/"
          element={
            token ? (
              <SocketProvider>
                <Dashboard />
              </SocketProvider>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
