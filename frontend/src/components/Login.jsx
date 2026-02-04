import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, ArrowRight, Loader2, Sparkles, Sun, Moon } from 'lucide-react';

export default function Login() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [message, setMessage] = useState(null);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const handleAuth = async (eventOrEmail) => {
        // Handle both form submission and direct call if needed
        const e = eventOrEmail?.preventDefault ? eventOrEmail : null;
        if (e) e.preventDefault();

        setLoading(true);
        setMessage(null);

        try {
            if (isForgotPassword) {
                // Determine redirect URL: Use env var, or production URL if on localhost, otherwise origin
                const productionUrl = 'https://tejas-evaluator.netlify.app';
                const redirectBase = import.meta.env.VITE_APP_URL || (window.location.hostname === 'localhost' ? productionUrl : window.location.origin);

                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${redirectBase}/login`,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Password reset link sent to your email!' });
            } else if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
            }
        } catch (error) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-primary text-text-primary font-sans transition-colors duration-300">
            {/* Dynamic Aurora Background */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-accent/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] animate-pulse" />

            {/* Theme Toggle - Absolute Position */}
            <button
                onClick={toggleTheme}
                className="absolute top-6 right-6 p-2 rounded-full bg-secondary border border-border text-text-secondary hover:text-accent transition-all z-50 shadow-md"
            >
                {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Glassmorphism Card */}
            <div className="relative w-full max-w-md p-6 z-10 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-3xl blur-sm pointer-events-none" />
                <div className="relative bg-card/60 backdrop-blur-xl border border-glass-border rounded-3xl shadow-2xl p-8 sm:p-10 ring-1 ring-white/5 transition-all duration-300">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-gradient-to-tr from-accent to-indigo-500/80 shadow-lg shadow-accent/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
                            {isForgotPassword ? 'Reset Password' : (isSignUp ? 'Create Account' : 'Welcome Back')}
                        </h1>
                        <p className="mt-2 text-sm text-text-secondary">
                            {isForgotPassword
                                ? 'Enter your email to receive a reset link'
                                : (isSignUp ? 'Get started with your free account' : 'Enter your credentials to access the workspace')}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-5">
                        {message && (
                            <div className={`p-3 text-xs rounded-lg border ${message.type === 'success'
                                ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                : 'bg-red-500/10 border-red-500/20 text-red-500'
                                }`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-text-tertiary group-focus-within:text-accent transition-colors" />
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    className="w-full bg-input border border-border rounded-xl px-10 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            {!isForgotPassword && (
                                <div className="space-y-1">
                                    <div className="relative group">
                                        <Lock className="absolute left-3 top-3 w-5 h-5 text-text-tertiary group-focus-within:text-accent transition-colors" />
                                        <input
                                            type="password"
                                            placeholder="••••••••"
                                            className="w-full bg-input border border-border rounded-xl px-10 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                        />
                                    </div>
                                    {!isSignUp && (
                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsForgotPassword(true);
                                                    setMessage(null);
                                                }}
                                                className="text-xs text-text-tertiary hover:text-accent transition-colors"
                                            >
                                                Forgot password?
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 disabled:cursor-not-allowed group border border-transparent"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    {isForgotPassword ? 'Send Reset Link' : (isSignUp ? 'Sign Up' : 'Sign In')}
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => {
                                if (isForgotPassword) {
                                    setIsForgotPassword(false);
                                } else {
                                    setIsSignUp(!isSignUp);
                                }
                                setMessage(null);
                            }}
                            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                        >
                            {isForgotPassword
                                ? 'Back to Sign In'
                                : (isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Create one")}
                        </button>
                    </div>

                    {!isForgotPassword && (
                        <div className="mt-8 pt-6 border-t border-border/50 text-center">
                            <div className="inline-block px-3 py-1 bg-secondary/50 rounded-lg border border-border/50">
                                <p className="text-[10px] text-text-tertiary font-mono tracking-wide">
                                    Demo: <span className="text-text-secondary select-all font-semibold">demo@meegrow.ai</span> / <span className="text-text-secondary select-all font-semibold">password123</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

