'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, LogIn, Shield, Clock } from 'lucide-react';
import { toast } from 'sonner';

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
    <div className="w-full max-w-md">
      <Card className="border-0 shadow-xl shadow-rose-100/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-rose-100 to-pink-100 p-2">
            <img
              src="/momternal_logo.png"
              alt="MOMternal Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-rose-900">
            MOMternal
          </CardTitle>
          <CardDescription className="text-sm text-rose-600/70">
            Mobilized Outreach Maternal Support
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nurse.santos@momternal.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-rose-400" />
              <span>DPA Compliant — Patient data is protected</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5 text-rose-400" />
              <span>Auto-logout after 20 minutes of inactivity</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-rose-100">
            <p className="text-xs text-muted-foreground text-center">
              Pre-seeded accounts for demo:
            </p>
            <div className="mt-2 space-y-1">
              {[
                { email: 'nurse.santos@momternal.ph', name: 'Maria Santos' },
                { email: 'nurse.reyes@momternal.ph', name: 'Ana Reyes' },
                { email: 'admin@momternal.ph', name: 'Admin' },
              ].map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword('nurse123');
                  }}
                  className="w-full text-left text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded px-2 py-1.5 transition-colors"
                >
                  {account.name} — {account.email}
                </button>
              ))}
              <p className="text-xs text-muted-foreground text-center mt-1">
                Password: <code className="bg-rose-50 px-1 rounded">nurse123</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
