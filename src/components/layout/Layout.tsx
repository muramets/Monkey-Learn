import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { ViewerBanner } from '../../features/teams/components/ViewerBanner';
import { PersonalityMottoBanner } from '../../features/personalities/components/PersonalityMottoBanner';
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation';

export function Layout({ children }: { children: React.ReactNode }) {
    useSwipeNavigation();

    // Structure mimics MonkeyType #app.content-grid
    // Using the ported #app and .content-grid rules from index.css
    // REMOVED explicit pt-8 pb-8 because #app in index.css already sets padding-top/bottom: 2rem
    return (
        <>
            <ViewerBanner />
            <PersonalityMottoBanner />
            <div id="app" className="content-grid transition-colors duration-300 font-mono">
                <Header />
                <main className="w-full h-full flex flex-col gap-4">
                    {useLocation().pathname !== '/settings' && <Navigation />}
                    <div className="relative w-full flex-1" style={{ isolation: 'isolate' }}>
                        {children}
                    </div>
                </main>
            </div>
        </>
    );
}
