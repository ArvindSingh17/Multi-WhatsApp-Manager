import React, { useState, useEffect } from 'react';
import './App.css'


function App() {
  const [sessions, setSessions] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [activeIndex, setactiveIndex] = useState()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('wa-sessions') || '[]');
    setSessions(stored);

    stored.forEach((_, index) => {
      window.electronAPI.addWhatsApp(index); 
    });

    const active = localStorage.getItem('wa-active');
    if (active !== null) {
      window.electronAPI.switchWhatsApp(Number(active));
      setactiveIndex(Number(active));
    }
  }, []);

  // Add new WhatsApp session
  const addSession = async () => {
    const index = sessions.length;

    await window.electronAPI.addWhatsApp(index);

    const newSessions = [...sessions, `Session ${index + 1}`];
    setSessions(newSessions);

    //  localStorage
    localStorage.setItem('wa-sessions', JSON.stringify(newSessions));
    localStorage.setItem('wa-active', index);
    setactiveIndex(index);
  };

const switchSession = (index) => {
  window.electronAPI.switchWhatsApp(index);
};

const toggleDarkMode = () => setDarkMode(!darkMode);

 const removeSession = async (index) => {
    await window.electronAPI.deleteWhatsApp(index);

    const newSessions = sessions.filter((_, i) => i !== index);
    setSessions(newSessions);
    localStorage.setItem('wa-sessions', JSON.stringify(newSessions));

    if (activeIndex === index) {
      if (newSessions.length > 0) {
        setactiveIndex(0);
        localStorage.setItem('wa-active', 0);
        window.electronAPI.switchWhatsApp(0); 
      } else {
        setactiveIndex(null);
        localStorage.removeItem('wa-active');
      }
    } else if (activeIndex > index) {
      const newActive = activeIndex - 1;
      setactiveIndex(newActive);
      localStorage.setItem('wa-active', newActive);
    }
  };
return (
  <div className="flex h-screen bg-gray-100 dark:bg-primary transition-colors duration-300">
    
    <div className="w-64 bg-white dark:bg-primary shadow-md p-6 overflow-scroll Scrollbar">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">WhatsApp Sessions</h3>
        <button
          onClick={toggleDarkMode}
          className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded"
        >
          {darkMode ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
            <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06l-1.06-1.06a.75.75 0 1 0-1.061 1.06l1.06 1.06Z" />
          </svg>
            : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="size-5">
              < path fill-rule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clip-rule="evenodd" />
            </svg>
          }
        </button>
      </div>
      <ul className="space-y-2 mb-6">
        {sessions.map((s, i) => (
          <li
            key={i}
            onClick={() => switchSession(i)}
            className="cursor-pointer px-3 py-2 rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-green-100 dark:hover:bg-green-600 text-sm text-gray-700 dark:text-gray-100 flex justify-between "
          >
            <span onClick={() => switchSession(i)}>WhatsApp {i + 1}</span>
            <button
              onClick={() => removeSession(i)}
              className="ml-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
              title="Remove session"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>

            </button>
          </li>


        ))}
      </ul>
      <button
        onClick={addSession}
        className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md text-sm font-medium transition"
      >
        ➕ Add WhatsApp
      </button>
    </div>

    
    <div className="flex-1 flex items-center justify-center">
      <h2 className="text-xl text-gray-600 dark:text-gray-300 font-medium">
        Welcome to WhatsApp Manager
      </h2>
    </div>
  </div >
);
}

export default App;
