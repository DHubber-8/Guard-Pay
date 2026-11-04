// Every route in the app. Tip: open /screens to see a clickable list of all screens.
import { Routes, Route } from "react-router-dom";
import { States, ScreensIndex } from "./pages/extras/Extras";

export default function App() {
  return (
    <Routes>
      <Route path="/extras/states" element={<States />} />
      <Route path="*" element={<ScreensIndex />} />
    </Routes>
  );
}
