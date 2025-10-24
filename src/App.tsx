
import React from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AppLayout } from './components/layout/AppLayout';
import LoginPage from './app/login/page';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a more sophisticated loading spinner
  }

  if (!user) {
    return <LoginPage />;
  }

  return <AppLayout />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
