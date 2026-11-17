import { useState, useEffect, useCallback } from 'react';
import API from '../services/api';

export default function OtpVerificationModal({ isOpen, onClose, targetValue, onSuccess }) {
    const [otp, setOtp] = useState('');
    const [sending, setSending] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(0);

    const handleSendOtp = useCallback(async () => {
        setSending(true);
        setError('');
        setMessage('');

        try {
            const res = await API.post('/auth/send-email-otp', {});

            if (res.data?.success) {
                setMessage(res.data.message || `Verification code sent to your email.`);
                setCountdown(30);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send verification code to your email.');
        } finally {
            setSending(false);
        }
    }, []);

    // Send initial OTP asynchronously when opened
    useEffect(() => {
        if (!isOpen) return;
        const timer = setTimeout(() => {
            handleSendOtp();
        }, 50);
        return () => clearTimeout(timer);
    }, [isOpen, handleSendOtp]);

    // Countdown timer for resend
    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setInterval(() => {
            setCountdown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [countdown]);

    const handleClose = () => {
        setOtp('');
        setError('');
        setMessage('');
        setCountdown(0);
        onClose();
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!otp.trim()) {
            setError('Please enter the 6-digit verification code');
            return;
        }

        setVerifying(true);
        setError('');
        setMessage('');

        try {
            const res = await API.post('/auth/verify-email', { otp: otp.trim() });

            if (res.data?.success) {
                setMessage(res.data.message || 'Email verified successfully!');
                if (onSuccess) {
                    onSuccess(res.data);
                }
                setTimeout(() => {
                    handleClose();
                }, 1200);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
        } finally {
            setVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
                <button
                    onClick={handleClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-lg w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-100 transition cursor-pointer border-0"
                >
                    ✕
                </button>

                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
                        ✉️
                    </div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        Verify Email Address
                    </h3>
                    <p className="text-slate-500 text-xs mt-1">
                        We sent a 6-digit verification code to{' '}
                        <strong className="text-slate-800">{targetValue || 'your email'}</strong>
                    </p>
                </div>

                {message && (
                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3 rounded-xl mb-4 text-center">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3 rounded-xl mb-4 text-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                            Enter 6-Digit Code
                        </label>
                        <input
                            type="text"
                            maxLength={6}
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                            placeholder="123456"
                            autoFocus
                            className="w-full text-center tracking-[12px] text-2xl font-black px-4 py-3 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition bg-slate-50 font-mono"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={verifying || otp.length < 6}
                        className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shadow-emerald-600/20 cursor-pointer border-0"
                    >
                        {verifying ? 'Verifying Code...' : 'Confirm Email Verification'}
                    </button>
                </form>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Didn't receive the email?</span>
                    <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sending || countdown > 0}
                        className="font-bold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 bg-transparent border-0 cursor-pointer"
                    >
                        {sending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                    </button>
                </div>
            </div>
        </div>
    );
}
