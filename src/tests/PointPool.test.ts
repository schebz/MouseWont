/**
 * Unit tests for PointPool
 */

import { PointPool } from '../utils/memory/PointPool';
import { Point } from '../core/types';

describe('PointPool', () => {
  test('allocates points with specified coordinates', () => {
    const pool = new PointPool(10);
    const point = pool.allocate(5, 10);
    
    expect(point.x).toBe(5);
    expect(point.y).toBe(10);
  });
  
  test('reuses points after reset', () => {
    const pool = new PointPool(10);
    
    // Allocate all points in the pool
    for (let i = 0; i < 10; i++) {
      pool.allocate(i, i);
    }
    
    // Utilization should be 100%
    expect(pool.getUtilization()).toBe(100);
    
    // Reset the pool
    pool.reset();
    
    // Utilization should be 0%
    expect(pool.getUtilization()).toBe(0);
    
    // We should be able to allocate again
    const point = pool.allocate(5, 10);
    expect(point.x).toBe(5);
    expect(point.y).toBe(10);
    
    // Utilization should be 10%
    expect(pool.getUtilization()).toBe(10);
  });
  
  test('expands pool when needed', () => {
    const pool = new PointPool(10, 20, true);
    
    // Allocate more points than the initial size
    const points: Point[] = [];
    for (let i = 0; i < 15; i++) {
      points.push(pool.allocate(i, i));
    }
    
    // All points should have the correct coordinates
    for (let i = 0; i < 15; i++) {
      expect(points[i].x).toBe(i);
      expect(points[i].y).toBe(i);
    }
    
    // Pool should have expanded
    expect(pool.getStats().poolSize).toBeGreaterThan(10);
  });
  
  test('respects maximum size', () => {
    const pool = new PointPool(5, 10, true);
    
    // Allocate up to the maximum size
    for (let i = 0; i < 10; i++) {
      pool.allocate(i, i);
    }
    
    // The next allocation should not expand the pool
    pool.allocate(100, 100);
    
    // Maximum pool size should be respected
    expect(pool.getStats().poolSize).toBeLessThanOrEqual(10);
  });
  
  test('releases points correctly', () => {
    const pool = new PointPool(10);
    
    // Allocate some points
    pool.allocate(1, 1);
    pool.allocate(2, 2);
    pool.allocate(3, 3);
    
    // Utilization should be 30%
    expect(pool.getUtilization()).toBe(30);
    
    // Release a point
    pool.release();
    
    // Utilization should be 20%
    expect(pool.getUtilization()).toBe(20);
    
    // Release more points
    pool.release();
    pool.release();
    
    // Utilization should be 0%
    expect(pool.getUtilization()).toBe(0);
    
    // Releasing more points than allocated should not go negative
    pool.release();
    expect(pool.getUtilization()).toBe(0);
  });
  
  test('allocates and releases multiple points', () => {
    const pool = new PointPool(20);
    
    // Allocate multiple points
    const points = pool.allocateMany(10);
    
    // Should have 10 points
    expect(points.length).toBe(10);
    
    // Utilization should be 50%
    expect(pool.getUtilization()).toBe(50);
    
    // Release multiple points
    pool.releaseMany(points);
    
    // Utilization should be 0%
    expect(pool.getUtilization()).toBe(0);
  });
  
  test('tracks allocations and releases', () => {
    const pool = new PointPool(10);
    
    // Allocate and release some points
    pool.allocate();
    pool.allocate();
    pool.release();
    pool.allocate();
    pool.release();
    pool.release();
    
    // Check stats
    const stats = pool.getStats();
    expect(stats.allocations).toBe(3);
    expect(stats.releases).toBe(3);
  });
});