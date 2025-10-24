
import React from 'react';
import { User } from 'firebase/auth';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface HeaderProps {
  user: User | null; // User object from Firebase Auth, or null if not signed in
  onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onSignOut }) => {
  return (
    <header className="flex items-center justify-between p-4 bg-gray-800 text-white border-b border-gray-700 z-10">
      <h1 className="text-2xl font-bold">MacroMate</h1>
      <div>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Avatar className='cursor-pointer'>
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
                    <AvatarFallback>{user.displayName?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className='px-2 py-1.5 text-sm'>
                <p className='font-medium'>{user.displayName}</p>
                <p className='text-xs text-gray-500'>{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onSignOut} className='cursor-pointer'>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
};
