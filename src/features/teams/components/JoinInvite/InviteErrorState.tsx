import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';

interface InviteErrorStateProps {
    error: string | null;
}

export function InviteErrorState({ error }: InviteErrorStateProps) {
    const navigate = useNavigate();

    return (
        <div
            className="relative min-h-screen flex items-center justify-center font-mono px-4"
            style={{ backgroundColor: 'var(--bg-color)' }}
        >

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center relative z-10 max-w-md"
            >
                <div
                    className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
                    style={{ backgroundColor: 'var(--sub-alt-color)' }}
                >
                    <FontAwesomeIcon
                        icon={faExclamationTriangle}
                        className="text-2xl"
                        style={{ color: 'var(--error-color)' }}
                    />
                </div>
                <h1
                    className="text-2xl font-bold mb-2 lowercase"
                    style={{ color: 'var(--text-color)' }}
                >
                    invalid invite
                </h1>
                <p className="mb-8 lowercase" style={{ color: 'var(--sub-color)' }}>
                    {error?.toLowerCase()}
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium lowercase transition-colors duration-200"
                    style={{
                        backgroundColor: 'var(--sub-alt-color)',
                        color: 'var(--text-color)',
                    }}
                >
                    go to dashboard
                    <FontAwesomeIcon icon={faArrowRight} className="text-sm" />
                </button>
            </motion.div>
        </div>
    );
}
