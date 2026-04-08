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
        {/* Decorative background heart */}
        <div className="absolute -right-20 -bottom-20 w-[420px] h-[420px] rounded-full bg-white/[0.04] blur-2xl" />
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-white/[0.04] blur-xl" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
          <img
            src="/momternal_logo.png"
            alt="MOMternal Logo"
            className="mb-4 max-w-[800px] w-full object-contain"
          />
          <p className="text-white/70 text-sm font-medium">
            Mobilized Outreach Maternal Support
          </p>

          <div className="mt-6 w-full space-y-1.5">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-sm text-white/80">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
                  <Icon className="h-4 w-4 text-white/90" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="absolute bottom-6 left-0 right-0 text-center text-xs text-white/40">
          Made with ❤ for UMAK
        </p>
      </div>

      {/* Right Panel — form */}
      <div className="flex w-full md:w-1/2 lg:w-[45%] items-center justify-center bg-white dark:bg-gray-950 px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo (shown only below md) */}
          <div className="mb-8 flex md:hidden flex-col items-center">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/40 dark:to-pink-900/40 p-1.5">
              <img
                src="/momternal_logo.png"
                alt="MOMternal Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="mt-2 text-lg font-bold text-rose-900 dark:text-rose-300">
              MOMternal
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Welcome Back
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sign in to your account
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="dark:text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="dark:text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-rose-600 hover:bg-rose-700 text-white font-medium"
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
