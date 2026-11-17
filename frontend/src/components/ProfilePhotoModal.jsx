export default function ProfilePhotoModal({ isOpen, onClose, photoUrl, name, subtitle = 'Profile Photo' }) {
    if (!isOpen || !photoUrl) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-3xl p-5 sm:p-6 shadow-2xl max-w-sm w-full space-y-4 border border-slate-100 animate-in fade-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="min-w-0 pr-2">
                        <h3 className="text-sm font-extrabold text-slate-900 truncate">
                            {name || 'Profile Photo'}
                        </h3>
                        {subtitle && (
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition border-0 cursor-pointer flex-shrink-0"
                        title="Close preview"
                    >
                        ✕
                    </button>
                </div>

                {/* Medium Size Photo Frame */}
                <div className="flex items-center justify-center p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80">
                    <img
                        src={photoUrl}
                        alt={name || 'Profile Photo'}
                        className="w-64 h-64 sm:w-72 sm:h-72 object-cover rounded-xl shadow-md border border-white"
                    />
                </div>

                <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400 font-medium">Medium preview</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer border-0 shadow-xs"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
