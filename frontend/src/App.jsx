import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import ProductDetails from './pages/ProductDetails';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-inner">
            <a href="/" className="logo">
              <span className="logo-icon">📊</span>
              INE Price Tracker
            </a>
            <nav className="header-nav">
              <a href="/" className="nav-link">Dashboard</a>
              <a href="/search" className="nav-link">Search & Track</a>
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/search" element={<Search />} />
            <Route path="/products/:id" element={<ProductDetails />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>INE Product Price Tracker — Software Engineer Intern Assignment</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
