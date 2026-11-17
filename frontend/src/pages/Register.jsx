import { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import API from '../services/api';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Register() {
    const [step, setStep] = useState('form'); // 'form' | 'verify_email'
    const [role, setRole] = useState('user'); // 'user' | 'ngo' | 'agent'
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Email verification state on the same page
    const [otp, setOtp] = useState('');
    const [verifyingOtp, setVerifyingOtp] = useState(false);
    const [resendingOtp, setResendingOtp] = useState(false);
    const [registeredEmail, setRegisteredEmail] = useState('');
    const [registeredRole, setRegisteredRole] = useState('user');
    const [resendCooldown, setResendCooldown] = useState(0);

    const googleBtnRef = useRef(null);
    const roleRef = useRef(role);

    const { googleLogin, register, setUser, setAuthSession } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        roleRef.current = role;
    }, [role]);

    // Resend countdown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleGoogleResponse = useCallback(async (response) => {
        setError('');
        setSubmitting(true);

        try {
            const userData = await googleLogin(response.credential, roleRef.current);
            if (userData.role === 'ngo') {
                navigate('/register-ngo');
            } else {
                navigate('/requirements');
            }
        } catch (err) {
            const errorMsg =
                err.response?.data?.message ||
                (err.request ? 'Unable to connect to the backend server (port 5001). Please make sure backend is running.' : err.message) ||
                'Registration failed. Please try again.';
            setError(errorMsg);
        } finally {
            setSubmitting(false);
        }
    }, [googleLogin, navigate]);

    // Step 1: Create Account & Send Email OTP
    const handleEmailRegister = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!name.trim() || !email.trim() || !password) {
            setError('Please fill in your name, email, and password');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setSubmitting(true);
        try {
            const userData = await register({
                name: name.trim(),
                email: email.trim(),
                password,
                phone: phone.trim(),
                role: role === 'ngo' ? 'ngo' : 'user'
            });

            // Transition to verification on the same page
            setRegisteredEmail(email.trim());
            setRegisteredRole(userData.role || (role === 'ngo' ? 'ngo' : 'user'));
            setStep('verify_email');
            setResendCooldown(30);
            setSuccessMsg(`Account created! A 6-digit verification code has been sent to ${email.trim()}.`);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    // Step 2: Verify Email OTP & Complete Login on the Same Page
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        if (!otp || otp.trim().length < 6) {
            setError('Please enter the complete 6-digit verification code');
            return;
        }

        setVerifyingOtp(true);
        try {
            const res = await API.post('/auth/verify-registration-otp', {
                email: registeredEmail,
                otp: otp.trim()
            });

            if (res.data?.success) {
                if (setAuthSession) {
                    setAuthSession(res.data.token, res.data.user);
                } else {
                    if (res.data.token) localStorage.setItem('token', res.data.token);
                    if (res.data.user && setUser) setUser(res.data.user);
                }
                setSuccessMsg('Email verified successfully! Logging you in...');

                setTimeout(() => {
                    if (registeredRole === 'ngo') {
                        navigate('/register-ngo');
                    } else {
                        navigate('/requirements');
                    }
                }, 1000);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Verification failed. Please check the code and try again.');
        } finally {
            setVerifyingOtp(false);
        }
    };

    // Resend verification code
    const handleResendOtp = async () => {
        setResendingOtp(true);
        setError('');
        setSuccessMsg('');

        try {
            const res = await API.post('/auth/resend-registration-otp', {
                email: registeredEmail
            });
            if (res.data?.success) {
                setSuccessMsg(res.data.message || `A new verification code has been sent to ${registeredEmail}.`);
                setResendCooldown(30);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend verification code.');
        } finally {
            setResendingOtp(false);
        }
    };

    useEffect(() => {
        if (!GOOGLE_CLIENT_ID || role === 'agent' || step !== 'form') return;

        const initGoogle = () => {
            if (window.google?.accounts?.id && googleBtnRef.current) {
                window.google.accounts.id.initialize({
                    client_id: GOOGLE_CLIENT_ID,
                    callback: handleGoogleResponse
                });
                window.google.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'outline',
                    size: 'large',
                    width: '100%',
                    text: 'continue_with',
                    shape: 'rectangular',
                    logo_alignment: 'left'
                });
            }
        };

        if (window.google?.accounts?.id) {
            initGoogle();
        } else {
            const interval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(interval);
                    initGoogle();
                }
            }, 200);
            return () => clearInterval(interval);
        }
    }, [handleGoogleResponse, role, step]);

    return (
        <div className="max-w-lg mx-auto my-10 px-6">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
                {step === 'verify_email' ? (
                    /* Step 2: Email Verification On the Same Page */
                    <div className="text-center">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl shadow-inner">
                            ✉️
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 mb-1 tracking-tight">
                            Verify Your Email
                        </h2>
                        <p className="text-slate-600 text-xs mb-6 leading-relaxed">
                            We sent a 6-digit verification code to <strong className="text-slate-900">{registeredEmail}</strong>.
                            Enter the code below to verify your email and sign in automatically.
                        </p>

                        {successMsg && (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold p-3.5 rounded-2xl mb-4 text-center">
                                {successMsg}
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold p-3.5 rounded-2xl mb-4 text-center">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleVerifyOtp} className="space-y-4">
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
                                    className="w-full text-center tracking-[12px] text-2xl font-black px-4 py-3.5 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none transition bg-slate-50 font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={verifyingOtp || otp.length < 6}
                                className="w-full py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-md shadow-emerald-600/20 cursor-pointer border-0"
                            >
                                {verifyingOtp ? 'Verifying & Signing In...' : 'Verify Email & Sign In ✨'}
                            </button>
                        </form>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs gap-3">
                            <button
                                type="button"
                                onClick={() => { setStep('form'); setError(''); setSuccessMsg(''); }}
                                className="text-slate-500 hover:text-slate-700 font-medium bg-transparent border-0 cursor-pointer"
                            >
                                ← Edit details / change email
                            </button>
                            <button
                                type="button"
                                onClick={handleResendOtp}
                                disabled={resendingOtp || resendCooldown > 0}
                                className="font-bold text-emerald-600 hover:text-emerald-700 disabled:text-slate-400 bg-transparent border-0 cursor-pointer"
                            >
                                {resendingOtp ? 'Sending...' : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
                            </button>
                        </div>
                    </div>
                ) : (
                    /* Step 1: Initial Registration Form */
                    <div>
                        <h1 className="text-2xl font-black text-center text-slate-900 mb-1 tracking-tight">
                            Create An Account ✨
                        </h1>
                        <p className="text-center text-slate-500 text-xs mb-6">
                            Join HelpConnect to donate supplies, manage requirements or partner with NGOs
                        </p>

                        {error && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs mb-4 border border-red-200 font-medium flex items-center gap-2">
                                <span>⚠️</span>
                                <span>{error}</span>
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                                I want to register as
                            </label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition font-medium text-slate-800"
                            >
                                <option value="user">Donor (Individual / Organization)</option>
                                <option value="ngo">NGO (Organization requiring supplies)</option>
                                <option value="agent">Pickup Agent (Logistics Partner)</option>
                            </select>
                        </div>

                        {role === 'agent' ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center my-4">
                                <span className="text-3xl block mb-2">🛵</span>
                                <h3 className="font-bold text-emerald-900 text-sm mb-1">
                                    Pickup Agent Onboarding
                                </h3>
                                <p className="text-xs text-emerald-800 leading-relaxed mb-4">
                                    Pickup agents are enrolled directly by verified partner NGOs. If your coordinator sent you an invite token, click below to activate your account.
                                </p>
                                <div className="flex flex-col gap-2">
                                    <Link
                                        to="/agent/activate"
                                        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition no-underline shadow-sm"
                                    >
                                        Activate Agent Account
                                    </Link>
                                    <Link
                                        to="/agent/login"
                                        className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition no-underline"
                                    >
                                        Already Activated? Sign In
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div>
                                {/* Email / Password Registration Form */}
                                <form onSubmit={handleEmailRegister} className="space-y-3.5 mb-6">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            Full Name
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="John Doe"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            Email Address
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="john@example.com"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            Phone Number (Optional)
                                        </label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="9876543210"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Minimum 6 characters"
                                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none transition"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition shadow-md shadow-green-600/20 cursor-pointer border-0 mt-2"
                                    >
                                        {submitting ? 'Creating Account & Sending OTP...' : `Register as ${role === 'ngo' ? 'NGO' : 'Donor'}`}
                                    </button>
                                </form>

                                <div className="relative my-5 text-center">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-slate-200"></div>
                                    </div>
                                    <span className="relative bg-white px-3 text-xs text-slate-400 font-medium uppercase">
                                        Or Continue With
                                    </span>
                                </div>

                                <div className="flex justify-center my-3">
                                    <div ref={googleBtnRef}></div>
                                </div>

                                {!GOOGLE_CLIENT_ID && (
                                    <p className="text-center text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200 mt-3">
                                        Google Client ID is not configured.
                                    </p>
                                )}
                            </div>
                        )}

                        <p className="text-center mt-6 text-sm text-slate-500">
                            Already registered?{' '}
                            <Link to="/login" className="text-green-600 hover:text-green-700 font-bold no-underline">
                                Login
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Register;
