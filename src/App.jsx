import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import ReviewerDashboard from './pages/ReviewerDashboard';
import UserARView from './pages/UserARView';
import './index.css';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/reviewer" element={<ReviewerDashboard />} />
        <Route path="/ar-user" element={<UserARView />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
