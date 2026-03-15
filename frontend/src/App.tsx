// frontend/src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Quiz from "./pages/Quiz";
import { TakeQuiz } from "./pages/TakeQuiz";
import Flashcards from "./pages/Flashcards";
import { ViewFlashcards } from "./pages/ViewFlashcards";
import Rapid from "./pages/Rapid";
import ImageMapQuiz from "./pages/ImageMapQuiz";
import Community from "./pages/Community";
import { Dashboard } from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import AdminWithPicker from "./pages/AdminWithPicker";
import { ViewNote } from "./pages/ViewNote";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="anatomytime-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/:id" element={<TakeQuiz />} />
            <Route path="/flashcards" element={<Flashcards />} />
            <Route path="/flashcards/:id" element={<ViewFlashcards />} />
            <Route path="/rapid" element={<Rapid />} />
            <Route path="/image-map" element={<ImageMapQuiz />} />
            <Route path="/image-map/:id" element={<ImageMapQuiz />} />
            <Route path="/community" element={<Community />} />
            <Route path="/notes/:id" element={<ViewNote />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AdminWithPicker />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;