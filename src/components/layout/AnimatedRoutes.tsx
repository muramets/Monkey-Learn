import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PAGE_ORDER } from '../../constants/navigation';

// Pages (lazy-loaded)
const Dashboard = React.lazy(() => import('../../pages/dashboard/DashboardPage'));
const ProtocolsList = React.lazy(() => import('../../features/protocols/components/ProtocolsList').then(m => ({ default: m.ProtocolsList })));
const InnerfacesPage = React.lazy(() => import('../../pages/innerfaces/InnerfacesPage'));
const HistoryPage = React.lazy(() => import('../../pages/history/HistoryPage'));
const StatsPage = React.lazy(() => import('../../pages/stats/StatsPage'));
const JoinInvitePage = React.lazy(() => import('../../pages/JoinInvitePage'));
const LoginPage = React.lazy(() => import('../../pages/LoginPage'));
const SettingsPage = React.lazy(() => import('../../pages/settings/SettingsPage').then(m => ({ default: m.SettingsPage })));
import { Layout } from './Layout';
import { GlobalLoader } from '../ui/molecules/GlobalLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useScoreContext } from '../../contexts/ScoreContext';
import { useTouchDevice } from '../../hooks/useTouchDevice';
import { ErrorBoundary } from '../ui/molecules/ErrorBoundary';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return user ? <>{children}</> : <Navigate to="/login" />;
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? '30%' : '-30%',
        opacity: 0,
        position: 'absolute' as const
    }),
    center: {
        x: 0,
        opacity: 1,
        position: 'relative' as const
    },
    exit: (direction: number) => ({
        x: direction < 0 ? '30%' : '-30%',
        opacity: 0,
        position: 'absolute' as const
    })
};

const transition = {
    type: "tween" as const,
    ease: [0.32, 0.72, 0, 1] as const, // iOS-native ease-out curve
    duration: 0.2
};

// Animated page wrapper component
const AnimatedPage = ({ children, pageKey, direction }: { children: React.ReactNode, pageKey: string, direction: number }) => (
    <motion.div
        key={pageKey}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
        className="w-full flex flex-col"
        style={{
            transformOrigin: 'center center'
        }}
    >
        {children}
    </motion.div>
);

export const AnimatedRoutes = () => {
    const location = useLocation();
    const { initialized } = useScoreContext();
    const { user } = useAuth();

    const isTouchDevice = useTouchDevice();

    const currentIndex = PAGE_ORDER.indexOf(location.pathname);

    // Use state tuple [prev, current] to track index changes safely during render
    const [pageIndices, setPageIndices] = React.useState([currentIndex, currentIndex]);

    if (pageIndices[1] !== currentIndex) {
        setPageIndices([pageIndices[1], currentIndex]);
    }

    const direction = pageIndices[1] > pageIndices[0] ? 1 : -1;

    // Only animate if both current and previous pages are in the swipeable order
    const isSwipeable = currentIndex !== -1;
    const effDirection = isSwipeable ? direction : 0;

    // Public routes (no layout)
    if (location.pathname === '/login' || location.pathname.startsWith('/invite/')) {
        return (
            <Suspense fallback={<GlobalLoader />}>
                <Routes location={location}>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/invite/:code" element={<JoinInvitePage />} />
                </Routes>
            </Suspense>
        );
    }

    // Private routes with shared layout
    if (!initialized && user) {
        return <GlobalLoader />;
    }

    // Helper: wraps page in ErrorBoundary + optional touch animation
    const page = (name: string, Component: React.LazyExoticComponent<React.ComponentType>) => {
        const content = (
            <ErrorBoundary section={name}>
                <Component />
            </ErrorBoundary>
        );
        return isTouchDevice ? (
            <AnimatedPage pageKey={location.pathname} direction={effDirection}>
                {content}
            </AnimatedPage>
        ) : content;
    };

    const routesContent = (
        <Routes location={location} key={location.pathname}>
            <Route path="/" element={page('Dashboard', Dashboard)} />
            <Route path="/actions" element={page('Actions', ProtocolsList)} />
            <Route path="/skills" element={page('Skills', InnerfacesPage)} />
            {/* Legacy URL — powers were renamed to skills in the UI */}
            <Route path="/powers" element={<Navigate to="/skills" replace />} />
            <Route path="/stats" element={page('Stats', StatsPage)} />
            <Route path="/history" element={page('History', HistoryPage)} />
            <Route path="/settings" element={page('Settings', SettingsPage)} />
        </Routes>
    );

    return (
        <PrivateRoute>
            <Layout>
                <Suspense fallback={<GlobalLoader />}>
                    {isTouchDevice ? (
                        <AnimatePresence mode="popLayout" initial={false} custom={effDirection}>
                            {routesContent}
                        </AnimatePresence>
                    ) : routesContent}
                </Suspense>
            </Layout>
        </PrivateRoute>
    );
};
