import AppRouter from "./routes/AppRouter";
import Reports from "./pages/Reports";
function App() {
  return <AppRouter />;
}
<Route path="/reports" element={<Reports />} />

export default App;