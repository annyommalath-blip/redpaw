import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Community from "./pages/Community";
import Search from "./pages/Search";
import Create from "./pages/Create";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import AIChat from "./pages/AIChat";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import AddDog from "./pages/AddDog";
import EditDog from "./pages/EditDog";
import DogDetail from "./pages/DogDetail";
import CareRequestDetail from "./pages/CareRequestDetail";
import LostAlertDetail from "./pages/LostAlertDetail";
import FoundDogDetail from "./pages/FoundDogDetail";
import Settings from "./pages/Settings";
import UserProfilePage from "./pages/UserProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/care-request/:requestId" element={<ProtectedRoute><CareRequestDetail /></ProtectedRoute>} />
            <Route path="/lost-alert/:id" element={<ProtectedRoute><LostAlertDetail /></ProtectedRoute>} />
            <Route path="/found-dog/:id" element={<ProtectedRoute><FoundDogDetail /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><Create /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/messages/ai" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
            <Route path="/messages/:conversationId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/add-dog" element={<ProtectedRoute><AddDog /></ProtectedRoute>} />
            <Route path="/profile/edit-dog/:dogId" element={<ProtectedRoute><EditDog /></ProtectedRoute>} />
            <Route path="/dog/:dogId" element={<ProtectedRoute><DogDetail /></ProtectedRoute>} />
            <Route path="/user/:userId" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
