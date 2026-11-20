import { Router, Response } from 'express';
import { queryAll, queryOne } from '../db/database.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { MentorRecordDB, StudentRecordDB } from '../models/types.js';

export const authRouter = Router();

/**
 * Returns current authenticated profile (mentor or student).
 */
authRouter.get('/me', (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.userRole === 'admin') {
      const mentor = queryOne<MentorRecordDB>('SELECT * FROM mentors LIMIT 1');
      res.json({
        role: 'admin',
        profile: mentor || {
          id: 'mentor-ganesh',
          name: 'Dr. R. Ganesh',
          email: 'ganesh.placement@college.edu',
          role: 'Lead Placement Mentor & Professor',
        },
      });
      return;
    }

    const student =
      req.student ||
      queryOne<StudentRecordDB>('SELECT * FROM students WHERE id = ?', [req.userId || 'stu-01']);

    res.json({
      role: 'student',
      profile: student,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Returns all students in batch (useful for dashboard & test identity switching).
 */
authRouter.get('/students', (_req: AuthenticatedRequest, res: Response) => {
  try {
    const students = queryAll<StudentRecordDB>('SELECT * FROM students ORDER BY roll_no ASC');
    res.json({ students });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
