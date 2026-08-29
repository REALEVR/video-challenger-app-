import { Routes, Route } from "react-router-dom";
import { NavBar } from "./components/NavBar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomeFeed } from "./pages/HomeFeed";
import { ChallengeList } from "./pages/ChallengeList";
import { ChallengeDetail } from "./pages/ChallengeDetail";
import { CreateChallenge } from "./pages/CreateChallenge";
import { UploadSubmission } from "./pages/UploadSubmission";
import { Profile } from "./pages/Profile";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { AdminPayouts } from "./pages/AdminPayouts";

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomeFeed />} />
          <Route path="/challenges" element={<ChallengeList />} />
          <Route path="/challenges/:id" element={<ChallengeDetail />} />
          <Route path="/challenges/:id/payouts" element={<AdminPayouts />} />
          <Route
            path="/create-challenge"
            element={
              <ProtectedRoute>
                <CreateChallenge />
              </ProtectedRoute>
            }
          />
          <Route
            path="/challenges/:id/upload"
            element={
              <ProtectedRoute>
                <UploadSubmission />
              </ProtectedRoute>
            }
          />
          <Route path="/profile/:id" element={<Profile />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </div>
  );
}
