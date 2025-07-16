import { describe, expect, it } from '@jest/globals';
import {
  AuthenticationError,
  FileSystemError,
  NetworkError,
  ValidationError,
} from './errors';

describe('Custom Error Classes', () => {
  it('AuthenticationError sets name and message', () => {
    const err = new AuthenticationError('auth failed');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AuthenticationError);
    expect(err.name).toBe('AuthenticationError');
    expect(err.message).toBe('auth failed');
  });

  it('NetworkError sets name, message, and statusCode', () => {
    const err = new NetworkError('network down', 503);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NetworkError);
    expect(err.name).toBe('NetworkError');
    expect(err.message).toBe('network down');
    expect(err.statusCode).toBe(503);
  });

  it('NetworkError statusCode is optional', () => {
    const err = new NetworkError('no code');
    expect(err.statusCode).toBeUndefined();
  });

  it('FileSystemError sets name, message, and path', () => {
    const err = new FileSystemError('file missing', '/tmp/file.txt');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FileSystemError);
    expect(err.name).toBe('FileSystemError');
    expect(err.message).toBe('file missing');
    expect(err.path).toBe('/tmp/file.txt');
  });

  it('FileSystemError path is optional', () => {
    const err = new FileSystemError('no path');
    expect(err.path).toBeUndefined();
  });

  it('ValidationError sets name and message', () => {
    const err = new ValidationError('bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('bad input');
  });
});
