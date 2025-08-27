import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { StudentDashboard } from '@/components/StudentDashboard';
import { LecturerDashboard } from '@/components/LecturerDashboard';
import { AdminDashboard } from '@/components/AdminDashboard';
import type { User, LoginInput, CreateUserInput, UserRole } from '../../server/src/schema';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

function App() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: false,
    error: null
  });
  
  const [loginData, setLoginData] = useState<LoginInput>({
    username: '',
    password: ''
  });

  const [registerData, setRegisterData] = useState<CreateUserInput>({
    username: '',
    email: '',
    password: '',
    role: 'STUDENT'
  });

  const [isRegistering, setIsRegistering] = useState(false);

  // Check for existing session on load
  useEffect(() => {
    const savedUser = localStorage.getItem('thesis_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser) as User;
        setAuthState({ user, isLoading: false, error: null });
      } catch (error) {
        localStorage.removeItem('thesis_user');
        console.error('Failed to parse saved user:', error);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await trpc.login.mutate(loginData);
      localStorage.setItem('thesis_user', JSON.stringify(response.user));
      setAuthState({ user: response.user, isLoading: false, error: null });
      setLoginData({ username: '', password: '' });
    } catch (error) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }));
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await trpc.register.mutate(registerData);
      localStorage.setItem('thesis_user', JSON.stringify(response));
      setAuthState({ user: response, isLoading: false, error: null });
      setRegisterData({ username: '', email: '', password: '', role: 'STUDENT' });
      setIsRegistering(false);
    } catch (error) {
      setAuthState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      }));
    }
  };

  const handleLogout = useCallback(() => {
    localStorage.removeItem('thesis_user');
    setAuthState({ user: null, isLoading: false, error: null });
  }, []);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-100 text-blue-800';
      case 'LECTURER': return 'bg-green-100 text-green-800';
      case 'ADMIN': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    switch (role) {
      case 'STUDENT': return 'Mahasiswa';
      case 'LECTURER': return 'Dosen Pembimbing';
      case 'ADMIN': return 'Administrator';
      default: return role;
    }
  };

  // Show dashboard based on user role
  if (authState.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">📚</span>
                  </div>
                  <h1 className="ml-3 text-xl font-bold text-gray-900">
                    SiBimSkripsi - Kebidanan Magelang
                  </h1>
                </div>
                <Badge className={getRoleBadgeColor(authState.user.role)}>
                  {getRoleDisplayName(authState.user.role)}
                </Badge>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700">
                  Selamat datang, <strong>{authState.user.username}</strong>
                </span>
                <Button variant="outline" onClick={handleLogout}>
                  Keluar
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {authState.user.role === 'STUDENT' && (
            <StudentDashboard user={authState.user} />
          )}
          {authState.user.role === 'LECTURER' && (
            <LecturerDashboard user={authState.user} />
          )}
          {authState.user.role === 'ADMIN' && (
            <AdminDashboard user={authState.user} />
          )}
        </main>
      </div>
    );
  }

  // Show authentication form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">📚</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            SiBimSkripsi
          </CardTitle>
          <CardDescription>
            Sistem Informasi Bimbingan Skripsi<br />
            Kebidanan Magelang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={isRegistering ? 'register' : 'login'} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger 
                value="login" 
                onClick={() => setIsRegistering(false)}
              >
                Masuk
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                onClick={() => setIsRegistering(true)}
              >
                Daftar
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="username" className="text-sm font-medium">
                    Username
                  </label>
                  <Input
                    id="username"
                    placeholder="Masukkan username"
                    value={loginData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password"
                    value={loginData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                    }
                    required
                  />
                </div>
                {authState.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {authState.error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={authState.isLoading}>
                  {authState.isLoading ? 'Masuk...' : 'Masuk'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="reg-username" className="text-sm font-medium">
                    Username
                  </label>
                  <Input
                    id="reg-username"
                    placeholder="Masukkan username"
                    value={registerData.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRegisterData((prev: CreateUserInput) => ({ ...prev, username: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="Masukkan email"
                    value={registerData.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRegisterData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Masukkan password"
                    value={registerData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRegisterData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                    }
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="reg-role" className="text-sm font-medium">
                    Peran
                  </label>
                  <select
                    id="reg-role"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={registerData.role}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setRegisterData((prev: CreateUserInput) => ({ 
                        ...prev, 
                        role: e.target.value as UserRole 
                      }))
                    }
                    required
                  >
                    <option value="STUDENT">Mahasiswa</option>
                    <option value="LECTURER">Dosen Pembimbing</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                {authState.error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                    {authState.error}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={authState.isLoading}>
                  {authState.isLoading ? 'Mendaftar...' : 'Daftar'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default App;