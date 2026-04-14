'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, LogIn, Stethoscope, Shield, Heart, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const features = [
  { icon: Stethoscope, label: 'AI-Assisted Assessments' },
  { icon: Shield, label: 'Secure Patient Records' },
  { icon: Heart, label: 'Comprehensive Maternal Care' },
  { icon: MapPin, label: 'Community Risk Mapping' },
];

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const login = useAppStore((s) => s.login);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        login(data.nurse);
        toast.success(`Welcome back, ${data.nurse.name}!`);
      } else {
        toast.error(data.error || 'Invalid credentials');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen">
      {/* Left Panel — branding (hidden on mobile) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600 dark:from-rose-800 dark:via-rose-900 dark:to-pink-950 flex-col items-center justify-center px-12 text-white">
        {/* Decorative floating orbs with animation */}
        <div className="absolute -right-20 -bottom-20 w-[420px] h-[420px] rounded-full bg-white/[0.04] blur-2xl animate-[pulse_8s_ease-in-out_infinite]" />
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-white/[0.04] blur-xl animate-[pulse_6s_ease-in-out_infinite_1s]" />
        <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full bg-pink-400/10 blur-xl animate-[pulse_10s_ease-in-out_infinite_2s]" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          {/* Logo with glow ring */}
          <div className="mb-5 w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center shadow-[0_0_40px_rgba(255,255,255,0.15)]">
            <img
              src="/momternal_logo.png"
              alt="MOMternal Logo"
              className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(255,255,255,0.3)]"
            />
          </div>
          <p className="text-white/60 text-xs font-semibold uppercase tracking-widest">
            Mobilized Outreach Maternal Support
          </p>

          {/* Feature list with hover feedback */}
          <div className="mt-8 w-full space-y-2">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-white/80 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-white/[0.08]">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <span className="font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-6 left-0 right-0 text-center text-sm font-medium text-white/50">
          Made with <span className="text-rose-300 font-semibold">R.N.</span> care
        </p>
      </div>

      {/* Right Panel — form */}
      <div className="flex w-full md:w-1/2 lg:w-[45%] items-center justify-center bg-gradient-to-b from-white to-rose-50/30 dark:from-gray-950 dark:to-gray-900 px-6 py-12 relative">
        {/* Subtle decorative top-right corner accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-rose-100/40 to-transparent dark:from-rose-950/20 dark:to-transparent rounded-bl-full" />
        <div className="relative w-full max-w-md">
          {/* Mobile logo (shown only below md) */}
          <div className="mb-8 flex md:hidden flex-col items-center">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 p-2 ring-1 ring-rose-200/60 dark:ring-rose-500/20 shadow-[0_0_16px_rgba(244,63,94,0.2)] dark:shadow-[0_0_20px_rgba(244,63,94,0.25)]">
              <img
                src="/momternal_logo.png"
                alt="MOMternal Logo"
                className="w-full h-full object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]"
              />
            </div>
            <span className="mt-3 text-lg font-bold text-rose-900 dark:text-rose-300 tracking-tight">
              MOMternal
            </span>
            <span className="mt-0.5 text-[11px] font-medium text-rose-500/70 dark:text-rose-400/50 uppercase tracking-widest">
              Maternal Health System
            </span>
          </div>

          {/* Heading with accent bar */}
          <div className="space-y-1.5">
            <div className="h-1 w-10 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 mb-3" />
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium dark:text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-gray-200 dark:border-gray-700 focus-visible:ring-rose-500/20 focus-visible:border-rose-400 transition-all duration-200"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium dark:text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10 border-gray-200 dark:border-gray-700 focus-visible:ring-rose-500/20 focus-visible:border-rose-400 transition-all duration-200"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-rose-500 focus-visible:text-rose-500 transition-colors duration-200 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/20"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-rose-600 to-rose-600 hover:from-rose-700 hover:to-rose-700 text-white font-medium shadow-md shadow-rose-600/20 hover:shadow-lg hover:shadow-rose-600/30 active:scale-[0.98] transition-all duration-200"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </div>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
