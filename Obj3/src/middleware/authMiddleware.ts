import { Request, Response, NextFunction } from 'express';
import { ENV } from '../config/env.js';
import { queryOne } from '../db/database.js';
import { StudentRecordDB } from '../models/types.js';

export interface AuthenticatedRequest extends Request {
  userRole?: 'admin' | 'student';
  userId?: string;
  student?: StudentRecordDB;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  // Support role and identity headers
  const roleHeader = (req.headers['x-role'] as string) || (req.query.role as string);
  const studentIdHeader = (req.headers['x-student-id'] as string) || (req.query.student_id as string);

  if (roleHeader === 'admin' || roleHeader === 'mentor') {
    req.userRole = 'admin';
    req.userId = ENV.MENTOR_DEFAULT_ID;
    return next();
  }

  // Default to student
  req.userRole = 'student';
  const studentId = studentIdHeader || 'stu-01'; // Default student Ananya Sundaram
  req.userId = studentId;

  const student = queryOne<StudentRecordDB>('SELECT * FROM students WHERE id = ?', [studentId]);
  if (student) {
    req.student = student;
  }

  next();
}

export function requireMentor(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({
      error: 'Forbidden: Mentor/Admin privilege required for this operation.',
    });
    return;
  }
  next();
}

export function requireStudent(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: 'Unauthorized: User identity required.' });
    return;
  }
  next();
}
