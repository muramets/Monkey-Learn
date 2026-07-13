import { motion, AnimatePresence } from 'framer-motion';
import type { User } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faUsers,
    faCheck,
    faArrowRight,
    faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { Button } from '../../../../components/ui/atoms/Button';
import { getIcon } from '../../../../config/iconRegistry';
import { resolveEntityColor } from '../../../../utils/entityColor';

// Google icon as SVG
function GoogleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    );
}

interface InviteData {
    teamName: string;
    teamIcon?: string;
    teamColor?: string;
    roleName: string;
    roleIcon?: string;
    roleColor?: string;
    roleDescription?: string;
    teamId: string;
}

interface InviteJoinCardProps {
    inviteData: InviteData | null;
    error: string | null;
    user: User | null;
    isAlreadyMember: boolean | undefined;
    isSigningIn: boolean;
    isJoining: boolean;
    onSignIn: () => void;
    onJoin: () => void;
    onNavigateHome: () => void;
    onNavigateLogin: () => void;
}

export function InviteJoinCard({
    inviteData,
    error,
    user,
    isAlreadyMember,
    isSigningIn,
    isJoining,
    onSignIn,
    onJoin,
    onNavigateHome,
    onNavigateLogin
}: InviteJoinCardProps) {

    const teamIconDef = inviteData?.teamIcon ? getIcon(inviteData.teamIcon) : null;
    const roleIconDef = inviteData?.roleIcon ? getIcon(inviteData.roleIcon) : null;

    return (
        <div
            className="relative min-h-screen flex items-center justify-center font-mono px-4 cursor-default select-none"
            style={{ backgroundColor: 'var(--bg-color)' }}
        >
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.5 }}
                className="relative z-10 w-full max-w-md bg-[var(--sub-alt-color)] rounded-3xl p-8 hover:shadow-2xl transition-shadow duration-300 shadow-xl"
            >
                {/* Header - No Icon, just text */}
                <div className="text-center mb-8">
                    <h1
                        className="text-3xl font-bold mb-2 lowercase tracking-tight"
                        style={{ color: 'var(--text-color)' }}
                    >
                        you're invited!
                    </h1>
                    <p className="text-base lowercase" style={{ color: 'var(--sub-color)' }}>
                        join a team and start your journey
                    </p>
                </div>

                {/* Team & Role Preview Card */}
                {inviteData && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}
                        whileHover={{
                            scale: 1.02,
                            backgroundColor: 'rgba(0,0,0,0.15)',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)'
                        }}
                        transition={{ duration: 0.2 }}
                        className="rounded-2xl p-5 mb-8"
                        style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                    >
                        <div className="flex items-center gap-4">
                            {/* Team Icon - StateCard Frozen Blur Style */}
                            <div
                                className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
                                style={{
                                    backgroundColor: `color-mix(in srgb, ${resolveEntityColor(inviteData.teamColor)} 20%, transparent)`,
                                    color: resolveEntityColor(inviteData.teamColor),
                                    boxShadow: `0 0 15px color-mix(in srgb, ${resolveEntityColor(inviteData.teamColor)} 8%, transparent)`
                                }}
                            >
                                {teamIconDef ? (
                                    <FontAwesomeIcon icon={teamIconDef} className="text-2xl" />
                                ) : (
                                    <FontAwesomeIcon icon={faUsers} className="text-2xl" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h2
                                    className="font-bold text-lg truncate"
                                    style={{ color: 'var(--text-color)' }}
                                >
                                    {inviteData.teamName}
                                </h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm" style={{ color: 'var(--sub-color)' }}>
                                        role:
                                    </span>
                                    {roleIconDef && (
                                        <FontAwesomeIcon
                                            icon={roleIconDef}
                                            style={{ color: inviteData.roleColor }}
                                            className="text-xs"
                                        />
                                    )}
                                    <span
                                        className="text-sm lowercase font-medium"
                                        style={{ color: inviteData.roleColor || 'var(--text-color)' }}
                                    >
                                        {inviteData.roleName}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {inviteData.roleDescription && (
                            <p
                                className="text-sm mt-4 pt-4 lowercase leading-relaxed"
                                style={{
                                    color: 'var(--sub-color)',
                                    borderTop: '1px solid rgba(255,255,255,0.05)',
                                }}
                            >
                                {inviteData.roleDescription}
                            </p>
                        )}
                    </motion.div>
                )}

                {/* Error message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg mb-6 text-sm w-full break-all text-left"
                            style={{
                                backgroundColor: 'rgba(var(--error-color-rgb, 202, 71, 84), 0.1)',
                                color: 'var(--error-color)',
                            }}
                        >
                            <FontAwesomeIcon icon={faExclamationTriangle} className="shrink-0" />
                            <span className="lowercase">{error}</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Already member */}
                <AnimatePresence>
                    {isAlreadyMember && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg mb-6 text-sm"
                            style={{
                                backgroundColor: 'rgba(var(--main-color-rgb, 230, 183, 100), 0.1)',
                                color: 'var(--main-color)',
                            }}
                        >
                            <FontAwesomeIcon icon={faCheck} />
                            <span className="lowercase">you're already a member of this team!</span>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Actions with Button Atom */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col gap-3"
                >
                    {!user ? (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={onSignIn}
                            isLoading={isSigningIn}
                            leftIcon={!isSigningIn ? <GoogleIcon /> : undefined}
                            className="w-full lowercase h-12 text-base"
                        >
                            {isSigningIn ? 'signing in...' : 'sign in with google to join'}
                        </Button>
                    ) : isAlreadyMember ? (
                        <Button
                            variant="primary"
                            size="lg" // Primary because it's the main action "Go to Dashboard"
                            onClick={onNavigateHome}
                            rightIcon={<FontAwesomeIcon icon={faArrowRight} />}
                            className="w-full lowercase h-12 text-base"
                        >
                            go to dashboard
                        </Button>
                    ) : (
                        <Button
                            variant="primary"
                            size="lg"
                            onClick={onJoin}
                            isLoading={isJoining}
                            leftIcon={!isJoining ? <FontAwesomeIcon icon={faCheck} /> : undefined}
                            className="w-full lowercase h-12 text-base"
                        >
                            {isJoining ? 'joining...' : 'join team'}
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="md"
                        onClick={onNavigateLogin}
                        className="w-full lowercase"
                    >
                        {user ? 'back to dashboard' : 'cancel'}
                    </Button>
                </motion.div>
            </motion.div>
        </div>
    );
}
