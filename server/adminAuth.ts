import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import session from 'express-session';
import { adminUsers, type AdminUser } from '@shared/schema';
import { storage } from './storage';

// Extend Express Request to include admin user
declare global {
  namespace Express {
    interface Request {
      adminUser?: AdminUser;
    }
  }
}

// Admin authentication middleware
export const isAdminAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  const adminUserId = req.session?.adminUserId;
  
  if (!adminUserId) {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  try {
    const adminUser = await storage.getAdminUser(adminUserId);
    if (!adminUser || !adminUser.isActive) {
      return res.status(401).json({ message: 'Admin account not found or inactive' });
    }

    req.adminUser = adminUser;
    next();
  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

// Hash password utility
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

// Verify password utility
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Initialize default admin user
export const initializeDefaultAdmin = async () => {
  try {
    const existingAdmin = await storage.getAdminUserByUsername('admin');
    if (!existingAdmin) {
      const hashedPassword = await hashPassword('password123');
      await storage.createAdminUser({
        username: 'admin',
        passwordHash: hashedPassword,
        email: 'admin@aimusicstudio.com',
        role: 'super_admin',
        isActive: true,
      });
      console.log('Default admin user created: admin/password123');
    }
  } catch (error) {
    console.error('Error initializing default admin:', error);
  }
};

// Admin session configuration
export const adminSessionConfig = {
  ...session({
    secret: process.env.SESSION_SECRET + '_admin',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
};

declare module 'express-session' {
  interface SessionData {
    adminUserId?: string;
  }
}