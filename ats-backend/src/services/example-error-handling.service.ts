/**
 * Example Service with Proper Error Handling
 * This file demonstrates best practices for using the error handling system
 */

import prisma from '../lib/prisma';
import { Logger } from '../utils/logger';
import {
  ValidationError,
  NotFoundError,
  DuplicateUserError,
  DatabaseError,
  InvalidFileTypeError,
  FileSizeExceededError,
} from '../utils/errors';

/**
 * Example: User Service with comprehensive error handling
 */
export class ExampleUserService {
  /**
   * Get user by email with proper error handling
   */
  async getUserByEmail(email: string) {
    try {
      // Validation
      if (!email || typeof email !== 'string') {
        throw new ValidationError('Email is required and must be a string', {
          providedEmail: email,
        });
      }

      if (!email.includes('@')) {
        throw new ValidationError('Invalid email format', {
          providedEmail: email,
        });
      }

      Logger.info('Fetching user by email', { email });

      // Database call
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundError('User', email);
      }

      Logger.info('User found successfully', { userId: user.id });
      return user;
    } catch (error) {
      // Re-throw AppErrors (they're already formatted)
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }

      // Wrap unexpected errors
      if (error instanceof Error) {
        Logger.error('Failed to fetch user', error, { email });
        throw new DatabaseError(`Failed to fetch user: ${error.message}`, 'findUnique');
      }

      throw error;
    }
  }

  /**
   * Create user with duplicate checking
   */
  async createUser(email: string, name: string, password: string) {
    try {
      // Validate inputs
      if (!email) throw new ValidationError('Email is required');
      if (!name) throw new ValidationError('Name is required');
      if (!password || password.length < 8) {
        throw new ValidationError('Password must be at least 8 characters');
      }

      Logger.info('Creating new user', { email, name });

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new DuplicateUserError(email);
      }

      // Create user (password should be hashed by auth service in real implementation)
      const user = await prisma.user.create({
        data: { email, firstName: name, passwordHash: password },
      });

      Logger.info('User created successfully', { userId: user.id, email });
      return user;
    } catch (error) {
      // Handle known error types
      if (
        error instanceof ValidationError ||
        error instanceof DuplicateUserError
      ) {
        throw error;
      }

      // Check for Prisma unique constraint violation
      if (
        error instanceof Error &&
        error.message.includes('Unique constraint failed')
      ) {
        throw new DuplicateUserError(email);
      }

      // Wrap other database errors
      if (error instanceof Error) {
        Logger.error('Failed to create user', error, { email });
        throw new DatabaseError(`Failed to create user: ${error.message}`, 'create');
      }

      throw error;
    }
  }

  /**
   * Example with file validation
   */
  async validateResumeFile(
    filename: string,
    fileSize: number,
    maxSizeBytes: number = 5 * 1024 * 1024
  ) {
    try {
      Logger.debug('Validating resume file', {
        filename,
        fileSize,
        maxSize: maxSizeBytes,
      });

      // Check file type
      const allowedExtensions = ['.pdf', '.docx', '.doc'];
      const fileExtension = filename.toLowerCase().substring(filename.lastIndexOf('.'));

      if (!allowedExtensions.includes(fileExtension)) {
        throw new InvalidFileTypeError(
          fileExtension,
          allowedExtensions
        );
      }

      // Check file size
      if (fileSize > maxSizeBytes) {
        throw new FileSizeExceededError(fileSize, maxSizeBytes);
      }

      Logger.info('Resume file validation passed', { filename });
      return true;
    } catch (error) {
      // Re-throw our custom errors
      if (
        error instanceof InvalidFileTypeError ||
        error instanceof FileSizeExceededError
      ) {
        throw error;
      }

      // Unexpected error
      Logger.error('Resume file validation failed', error as Error, { filename });
      throw error;
    }
  }
}

/**
 * Usage in Route Handler (using asyncHandler):
 *
 * import { asyncHandler } from '../middleware/error.middleware';
 *
 * router.post('/users', asyncHandler(async (req, res) => {
 *   const service = new ExampleUserService();
 *   const user = await service.createUser(req.body.email, req.body.name, req.body.password);
 *   
 *   res.status(201).json({
 *     success: true,
 *     data: user,
 *   });
 * }));
 */
