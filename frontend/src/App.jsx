import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FarmForm from "./pages/FarmForm";
import FertilizerForm from "./pages/FertilizerForm";
import FarmDetails from "./pages/FarmDetails";
import ExpenseAnalytics from "./pages/ExpenseAnalytics";
import FarmExpenseAnalytics from "./pages/FarmExpenseAnalytics";
import AddExpense from "./pages/AddExpense";
import AddIncome from "./pages/AddIncome";
import FarmIncome from "./pages/FarmIncome";
import YieldAnalyticsPage from "./pages/YieldAnalyticsPage";
import Signup from "./pages/Signup";
import FarmEditForm from "./pages/FarmEditForm";

import './App.css'

function AppRoutes() {
  const navigate = useNavigate();

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Login onLoginSuccess={() => navigate("/dashboard")} />
        }
      />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/farm/:farmId" element={<FarmDetails />} />
      <Route path="/add-farm" element={<FarmForm />} />
      <Route path="/add-fertilizer" element={<FertilizerForm />} />
      <Route path="/expenses" element={<ExpenseAnalytics />} />
      <Route path="/farm/:farmId/expenses" element={<FarmExpenseAnalytics />} />
      <Route path="/farm/:farmId/add-expense" element={<AddExpense />} />
      <Route path="/expenses/edit/:id" element={<AddExpense />} />
      <Route path="/farm/:farmId/income/add" element={<AddIncome />} />
      <Route path="/farm/:farmId/income" element={<FarmIncome />} />
      <Route path="/farm/:id/yield" element={<YieldAnalyticsPage />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/farm/:farmId/edit" element={<FarmEditForm />} />


    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
