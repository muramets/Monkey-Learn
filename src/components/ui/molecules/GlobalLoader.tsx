import { useScoreContext } from '../../../contexts/ScoreContext';

export const GlobalLoader = () => {
    const { progress } = useScoreContext();

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-text-primary">
            <div className="flex flex-col items-center gap-8 w-full max-w-md px-8">
                {/* Progress Bar Container */}
                <div className="w-full h-2 bg-sub-alt rounded-full overflow-hidden">
                    {/* Real Progress Fill */}
                    <div
                        className="h-full bg-main rounded-full transition-[width] duration-300 ease-out"
                        style={{
                            width: `${progress}%`,
                            transformOrigin: 'left',
                        }}
                    />
                </div>

                {/* Text */}
                <div className="font-mono text-text-primary">
                    {progress <= 25 ? "Connecting to server..." : "Downloading user data..."}
                </div>
            </div>
        </div>
    );
};
