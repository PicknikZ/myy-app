import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Video from './Video'
import Main from './Main'
import Image from './Image'

function App() {
  return (
    <div className="App">
      <header className="App-header">
      <Router>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/video" element={<Video />} />
        <Route path="/image" element={<Image />} />
      </Routes>
      </Router>
      </header>
    </div>
  );
}

export default App;
