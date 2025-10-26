import { BrowserRouter, Routes, Route } from "react-router-dom";
import EnterAmount from "./screens/EnterAmount";
import EnterPin from "./screens/EnterPin";
import Success from "./screens/Success";
import Failed from "./screens/Failed";
import LandingPage from "./screens/LandingPage";
import RegisterCard from "./screens/RegisterCard";
import TapCard from "./screens/TapCard";
import TopUp from "./screens/TopUp";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/tap-card" element={<TapCard simulatedCardAddress="0xABC123DEF456" />} />
        <Route path="/topup" element={<TopUp/>} />
        <Route path="/register-card" element={<RegisterCard />} />
        <Route path="/amount" element={<EnterAmount />} />
        <Route path="/pin" element={<EnterPin />} />
        <Route path="/success" element={<Success />} />
        <Route path="/failed" element={<Failed />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
