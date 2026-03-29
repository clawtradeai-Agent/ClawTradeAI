import { describe, it, expect } from 'vitest';
import { cn } from './cn';

describe('UI Utils', () => {
  describe('cn', () => {
    it('should merge class names correctly', () => {
      expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
    });

    it('should handle conditional classes', () => {
      expect(cn('base', true && 'active', false && 'inactive')).toBe('base active');
    });

    it('should handle undefined and null', () => {
      expect(cn('base', undefined, null)).toBe('base');
    });

    it('should merge Tailwind classes properly', () => {
      expect(cn('p-4 p-2')).toBe('p-2');
    });
  });
});
