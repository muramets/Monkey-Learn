import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PAGE_ORDER } from '../../constants/navigation';

// Pages
import Dashboard from '../../pages/dashboard/DashboardPage';
import { ProtocolsList } from '../../features/protocols/components/ProtocolsList';
import InnerfacesPage from '../../pages/innerfaces/InnerfacesPage';
import HistoryPage from '../../pages/history/HistoryPage';
import JoinInvitePage from '../../pages/JoinInvitePage';
import LoginPage from '../../pages/LoginPage';
import { SettingsPage } from '../../pages/settings/SettingsPage';
import { Layout } from './Layout';
import { GlobalLoader } from '../ui/molecules/GlobalLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useScoreContext } from '../../contexts/ScoreContext';

function PrivateRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    return user ? <>{children}</> : <Navigate to="/login" />;
}

const variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? '100%' : '-100%',
        position: 'absolute' as const
    }),
    center: {
        x: 0,
        position: 'relative' as const
    },
    exit: (direction: number) => ({
        x: direction < 0 ? '100%' : '-100%',
        opacity: 0,
        position: 'absolute' as const
    })
};

const transition = {
    type: "tween" as const,
    ease: [0.25, 0.1, 0.25, 1] as const, // Premium cubic bezier curve
    duration: 0.45
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

    // Detect touch device
    const [isTouchDevice, setIsTouchDevice] = React.useState(false);

    React.useEffect(() => {
        const checkTouch = () => {
            const hasTouch = 'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                window.matchMedia('(pointer: coarse)').matches;
            setIsTouchDevice(hasTouch);
        };

        checkTouch();
        // Re-check on resize in case device orientation changes
        window.addEventListener('resize', checkTouch);
        return () => window.removeEventListener('resize', checkTouch);
    }, []);

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
            <Routes location={location}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/invite/:code" element={<JoinInvitePage />} />
            </Routes>
        );
    }

    // Private routes with shared layout
    if (!initialized && user) {
        return <GlobalLoader />;
    }

    // Render routes without animation on desktop
    const routesContent = (
        <Routes location={location} key={location.pathname}>
            <Route path="/" element={
                isTouchDevice ? (
                    <AnimatedPage pageKey={location.pathname} direction={effDirection}>
                        <Dashboard />
                    </AnimatedPage>
                ) : <Dashboard />
            } />
            <Route path="/actions" element={
                isTouchDevice ? (
                    <AnimatedPage pageKey={location.pathname} direction={effDirection}>
                        <ProtocolsList />
                    </AnimatedPage>
                ) : <ProtocolsList />
            } />
            <Route path="/powers" element={
                isTouchDevice ? (
                    <AnimatedPage pageKey={location.pathname} direction={effDirection}>
                        <InnerfacesPage />
                    </AnimatedPage>
                ) : <InnerfacesPage />
            } />
            <Route path="/history" element={
                isTouchDevice ? (
                    <AnimatedPage pageKey={location.pathname} direction={effDirection}>
                        <HistoryPage />
                    </AnimatedPage>
                ) : <HistoryPage />
            } />
            <Route path="/settings" element={
                isTouchDevice ? (
                    <AnimatedPage pageKey={location.pathname} direction={effDirection}>
                        <SettingsPage />
                    </AnimatedPage>
                ) : <SettingsPage />
            } />
        </Routes>
    );

    return (
        <PrivateRoute>
            <Layout>
                {isTouchDevice ? (
                    <AnimatePresence mode="popLayout" initial={false} custom={effDirection}>
                        {routesContent}
                    </AnimatePresence>
                ) : routesContent}
            </Layout>
        </PrivateRoute>
    );
};
