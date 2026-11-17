function Loading() {
    return (
        <div className="flex flex-col justify-center items-center min-h-52 gap-3 py-8">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm font-medium">Loading...</p>
        </div>
    );
}

export default Loading;
