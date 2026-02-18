import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import Quiz from "./pages/Quiz";
import BadgeLanding from "./pages/BadgeLanding";

export default function App() {
  return (
    <Router>
      {/* App shell: keep it neutral and consistent */}
      <div className="min-h-screen text-white">
        <nav className="mx-auto w-full max-w-5xl px-4 py-5">
          <div className="flex items-center justify-between">
            <Link to="/quiz" className="font-semibold tracking-tight hover:opacity-90">
              GeniusSeeker
            </Link>

            <div className="flex items-center gap-4 text-sm">
              <Link
                to="/quiz"
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10"
              >
                🎓 Quiz
              </Link>
            </div>
          </div>
        </nav>

        <Routes>
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/badge/:badgeKey" element={<BadgeLanding />} />
          <Route path="/" element={<Quiz />} />
        </Routes>
      </div>
    </Router>
  );
}
