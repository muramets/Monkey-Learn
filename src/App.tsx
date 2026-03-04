import { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthProvider';
import { useAuth } from './contexts/AuthContext';
import { QueryProvider } from './contexts/QueryProvider';
import { ScoreProvider } from './contexts/ScoreProvider';
import { StoreSync } from './stores/StoreSync';
import { TooltipProvider } from './components/ui/atoms/Tooltip';
import { GlobalLoader } from './components/ui/molecules/GlobalLoader';
import { Toast } from './components/ui/molecules/Toast';
import { ThemeController } from './components/layout/ThemeController';
import { useUIStore } from './stores/uiStore';
import { initTheme } from './utils/themeManager';
import { AnimatedRoutes } from './components/layout/AnimatedRoutes';
import { CommentInputOverlay } from './features/comments/components/CommentInputOverlay';

function AppContent() {
  const { loading: authLoading } = useAuth();
  const { toast, hideToast } = useUIStore();

  // Logic: 
  // 1. Auth Loading -> Show Loader
  // 2. No User -> Show Login (App handles routing)
  // 3. User & !Initialized -> Show GlobalLoader
  // 4. Always render StoreSync to ensure data fetching starts if user exists.
  // Invite route needs to handle its own loading states
  // So we check the current path and bypass GlobalLoader for invite routes
  const isInviteRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/invite/');

  if (authLoading && !isInviteRoute) return <GlobalLoader />;

  return (
    <TooltipProvider delayDuration={300}>
      <Router>
        <StoreSync />
        <ThemeController />
        <Toast
          message={toast.message}
          isVisible={toast.isVisible}
          type={toast.type}
          onClose={hideToast}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
        />
        <CommentInputOverlay />
        <AnimatedRoutes />
      </Router>
    </TooltipProvider>
  );
}

function App() {
  useEffect(() => {
    // Initialize theme from localStorage (or default to serika_dark)
    initTheme();
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <ScoreProvider>
          {/* Explicit Background Layer to fix compositing tint issues */}
          <div
            className="fixed inset-0 bg-bg-primary -z-50"
            style={{
              transform: 'translate3d(0, 0, 0)',
              backfaceVisibility: 'hidden',
              perspective: '1000px',
              willChange: 'transform'
            }}
          />
          <AppContent />
        </ScoreProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export default App;
