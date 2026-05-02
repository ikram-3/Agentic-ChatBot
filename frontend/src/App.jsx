import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Chatbot from './components/Chatbot';

function App() {
  return (
    <ThemeProvider>
      <Chatbot />
    </ThemeProvider>
  );
}

export default App;
