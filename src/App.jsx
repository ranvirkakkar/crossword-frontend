import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';
import CrosswordGame from './components/CrosswordGame';
import Admin from './components/Admin';

const NavButton = () => {
  const location = useLocation();
  const onAdminPage = location.pathname.startsWith('/admin');

  if (onAdminPage) {
    return (
      <Link to="/" className="st-admin-link" aria-label="Return to crossword">
        Play Crossword
      </Link>
    );
  }

  return (
    <Link to="/admin" className="st-admin-link" aria-label="Go to admin tools">
      Admin Panel
    </Link>
  );
};

function App() {
  return (
    <Router>
      <div className="st-app st-app--minimal">
        <main className="st-main" id="main-content" role="main">
          <NavButton />
          <Routes>
            <Route path="/" element={<CrosswordGame />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
