#!/usr/bin/env python3
"""
@file math_server.py
@version 0.1.0
@lastModified 2025-11-05
@changelog Enhanced Python implementation of mathematical operations server
"""

import os
import sys
import json
import time
import math
import random
import numpy as np
from dataclasses import dataclass
from typing import List, Tuple, Dict, Any, Optional, Union
from flask import Flask, request, jsonify
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Point class
@dataclass
class Point:
    x: float
    y: float
    
    def to_dict(self) -> Dict[str, float]:
        return {"x": self.x, "y": self.y}
    
    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> 'Point':
        return cls(x=data["x"], y=data["y"])

# Path generation functions
class BezierCurveGenerator:
    """Generates paths using cubic Bézier curves"""
    
    @staticmethod
    def generate_curve(p0: Point, p1: Point, p2: Point, p3: Point, num_points: int) -> List[Point]:
        """Generate points along a cubic Bézier curve"""
        path = []
        
        for i in range(num_points):
            t = i / (num_points - 1)
            mt = 1 - t
            mt2 = mt * mt
            mt3 = mt2 * mt
            t2 = t * t
            t3 = t2 * t
            
            # Cubic Bézier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
            x = mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x
            y = mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
            
            path.append(Point(x, y))
        
        return path
    
    @staticmethod
    def generate_path(start: Point, end: Point, complexity: float, 
                     overshoot_factor: float, jitter_amount: float, 
                     num_points: int, seed: Optional[int] = None) -> List[Point]:
        """Generate a path between two points using a Bézier curve with calculated control points"""
        # Set random seed if provided
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
        
        # Calculate vector from start to end
        dx = end.x - start.x
        dy = end.y - start.y
        distance = math.sqrt(dx * dx + dy * dy)
        
        # Base influence factors scaled by complexity and distance
        base_influence = min(0.5, max(0.2, distance / 1000)) * (0.5 + complexity * 0.5)
        
        # Use slightly different influences for each control point for asymmetric curves
        influence1 = base_influence * (0.8 + 0.4 * random.random())
        influence2 = base_influence * (0.8 + 0.4 * random.random())
        
        # Add randomness to control point positions
        jitter_scale = min(50, distance * 0.2) * jitter_amount * 0.1
        jitter_x1 = np.random.normal(0, jitter_scale)
        jitter_y1 = np.random.normal(0, jitter_scale)
        jitter_x2 = np.random.normal(0, jitter_scale)
        jitter_y2 = np.random.normal(0, jitter_scale)
        
        # Create perpendicular offset for natural arcs
        perp_magnitude = complexity * 0.5 * (random.random() - 0.5)
        perp_x = -dy * perp_magnitude
        perp_y = dx * perp_magnitude
        
        # Calculate control points
        cp1 = Point(
            start.x + dx * influence1 + perp_x + jitter_x1,
            start.y + dy * influence1 + perp_y + jitter_y1
        )
        
        cp2 = Point(
            end.x - dx * influence2 - perp_x + jitter_x2,
            end.y - dy * influence2 - perp_y + jitter_y2
        )
        
        # Apply overshoot effect if requested
        if overshoot_factor > 0 and distance > 100:
            overshoot_amount = overshoot_factor * (0.1 + 0.1 * random.random())
            cp2.x = end.x + dx * overshoot_amount
            cp2.y = end.y + dy * overshoot_amount
        
        # Generate the path
        return BezierCurveGenerator.generate_curve(start, cp1, cp2, end, num_points)

class MinimumJerkGenerator:
    """Generates paths using the minimum-jerk trajectory model"""
    
    @staticmethod
    def generate_path(start: Point, end: Point, num_points: int) -> List[Point]:
        """Generate a minimum-jerk trajectory from start to end"""
        path = []
        
        for i in range(num_points):
            # Normalized time parameter [0, 1]
            t = i / (num_points - 1)
            
            # Minimum-jerk position profile: x(t) = x₀ + (x₁ - x₀)(10t³ - 15t⁴ + 6t⁵)
            jerk_profile = 10 * (t**3) - 15 * (t**4) + 6 * (t**5)
            
            # Calculate position at this time
            x = start.x + (end.x - start.x) * jerk_profile
            y = start.y + (end.y - start.y) * jerk_profile
            
            path.append(Point(x, y))
        
        return path
    
    @staticmethod
    def generate_two_phase_path(start: Point, end: Point, overshoot_factor: float, 
                              num_points: int, seed: Optional[int] = None) -> List[Point]:
        """Generate a two-phase minimum-jerk trajectory with optional overshoot"""
        # Set random seed if provided
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
        
        # Calculate intermediate point with overshoot
        dx = end.x - start.x
        dy = end.y - start.y
        distance = math.sqrt(dx**2 + dy**2)
        
        # Random overshoot based on distance and factor
        overshoot_scale = min(0.3, distance * 0.001) * overshoot_factor
        overshoot_x = np.random.normal(0, overshoot_scale * abs(dx))
        overshoot_y = np.random.normal(0, overshoot_scale * abs(dy))
        
        # Create intermediate target with overshoot
        intermediate = Point(
            end.x + overshoot_x,
            end.y + overshoot_y
        )
        
        # Calculate phase durations (first phase is about 70% of total)
        phase1_points = int(num_points * 0.7)
        phase2_points = num_points - phase1_points
        
        # Generate the two phases
        path1 = MinimumJerkGenerator.generate_path(start, intermediate, phase1_points)
        path2 = MinimumJerkGenerator.generate_path(intermediate, end, phase2_points)
        
        # Combine paths (remove duplicate point at junction)
        return path1 + path2[1:]

class OrnsteinUhlenbeckProcess:
    """Generates jitter using the Ornstein-Uhlenbeck process"""
    
    @staticmethod
    def generate_process(points: int, theta: float, sigma: float, dt: float, 
                       seed: Optional[int] = None) -> Tuple[List[float], List[float]]:
        """Generate Ornstein-Uhlenbeck jitter process"""
        # Set random seed if provided
        if seed is not None:
            np.random.seed(seed)
        
        # Initialize arrays
        jitter_x = np.zeros(points)
        jitter_y = np.zeros(points)
        
        # Generate the process
        sqrt_dt = math.sqrt(dt)
        
        for i in range(1, points):
            # Update jitter using Ornstein-Uhlenbeck process
            # dX = θ(μ - X)dt + σdW, where μ = 0 (mean reversion level)
            jitter_x[i] = jitter_x[i-1] * (1 - theta * dt) + sigma * sqrt_dt * np.random.normal()
            jitter_y[i] = jitter_y[i-1] * (1 - theta * dt) + sigma * sqrt_dt * np.random.normal()
        
        return jitter_x.tolist(), jitter_y.tolist()
    
    @staticmethod
    def generate_position_dependent_process(points: int, theta_base: float, theta_scale: float,
                                         sigma_base: float, sigma_scale: float, 
                                         dt: float, seed: Optional[int] = None) -> Tuple[List[float], List[float]]:
        """Generate position-dependent Ornstein-Uhlenbeck jitter process
        
        Parameters:
        - theta_base: Base reversion rate
        - theta_scale: How much theta increases near endpoints
        - sigma_base: Base noise magnitude
        - sigma_scale: How much sigma varies along path
        """
        # Set random seed if provided
        if seed is not None:
            np.random.seed(seed)
        
        # Initialize arrays
        jitter_x = np.zeros(points)
        jitter_y = np.zeros(points)
        
        # Generate the process
        sqrt_dt = math.sqrt(dt)
        
        for i in range(1, points):
            # Position in the movement (0 to 1)
            pos = i / (points - 1)
            
            # Position-dependent parameters
            # Increase reversion rate (theta) near endpoints
            endpoint_proximity = min(pos, 1-pos)
            theta = theta_base + theta_scale * (1 / (endpoint_proximity + 0.1))
            
            # Vary sigma along the path
            sigma = sigma_base * (1 + sigma_scale * math.sin(math.pi * pos)**2)
            
            # Update jitter using position-dependent Ornstein-Uhlenbeck process
            jitter_x[i] = jitter_x[i-1] * (1 - theta * dt) + sigma * sqrt_dt * np.random.normal()
            jitter_y[i] = jitter_y[i-1] * (1 - theta * dt) + sigma * sqrt_dt * np.random.normal()
        
        return jitter_x.tolist(), jitter_y.tolist()

class PhysicsSimulator:
    """Simulates physics-based movement with a damped spring model"""
    
    @staticmethod
    def simulate_movement(start: Point, end: Point, mass: float, spring_constant: float,
                        damping_factor: float, time_step: float, max_steps: int,
                        stopping_threshold: float, seed: Optional[int] = None) -> List[Point]:
        """Simulate physics-based movement"""
        # Set random seed if provided
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
        
        # Initialize path with starting point
        path = [Point(start.x, start.y)]
        
        # Current state
        position = Point(start.x, start.y)
        velocity = Point(0.0, 0.0)
        
        # Small amount of noise for more natural movement
        noise_magnitude = 0.01 * stopping_threshold
        
        # Run simulation
        for step in range(max_steps):
            # Calculate spring force
            dx = end.x - position.x
            dy = end.y - position.y
            
            # Add small noise to force
            noise_x = np.random.normal(0, noise_magnitude)
            noise_y = np.random.normal(0, noise_magnitude)
            
            # Calculate acceleration
            acc_x = (spring_constant * dx - damping_factor * velocity.x + noise_x) / mass
            acc_y = (spring_constant * dy - damping_factor * velocity.y + noise_y) / mass
            
            # Update velocity
            velocity.x += acc_x * time_step
            velocity.y += acc_y * time_step
            
            # Update position
            position.x += velocity.x * time_step
            position.y += velocity.y * time_step
            
            # Add to path
            path.append(Point(position.x, position.y))
            
            # Check if we're close enough to target and almost stopped
            distance = math.sqrt(dx**2 + dy**2)
            speed = math.sqrt(velocity.x**2 + velocity.y**2)
            
            if distance < stopping_threshold and speed < stopping_threshold:
                break
        
        return path
    
    @staticmethod
    def simulate_nonlinear_movement(start: Point, end: Point, mass: float, base_spring_constant: float,
                                 damping_factor: float, time_step: float, max_steps: int,
                                 stopping_threshold: float, seed: Optional[int] = None) -> List[Point]:
        """Simulate physics-based movement with non-linear spring and damping"""
        # Set random seed if provided
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)
        
        # Initialize path with starting point
        path = [Point(start.x, start.y)]
        
        # Current state
        position = Point(start.x, start.y)
        velocity = Point(0.0, 0.0)
        
        # Small amount of noise for more natural movement
        noise_magnitude = 0.01 * stopping_threshold
        
        # Non-linear parameters
        k0 = 1.0  # Base spring constant multiplier
        k1 = 5.0  # Distance-dependent component
        speed_factor = 0.5  # Speed-dependent damping
        
        # Run simulation
        for step in range(max_steps):
            # Calculate distance and direction to target
            dx = end.x - position.x
            dy = end.y - position.y
            distance = math.sqrt(dx**2 + dy**2)
            speed = math.sqrt(velocity.x**2 + velocity.y**2)
            
            # Non-linear spring constant that increases as we get closer to target
            effective_spring = base_spring_constant * (k0 + k1 / (distance + 1.0))
            
            # Non-linear damping that increases with speed
            effective_damping = damping_factor * (1.0 + speed_factor * speed)
            
            # Add small noise to force
            noise_x = np.random.normal(0, noise_magnitude)
            noise_y = np.random.normal(0, noise_magnitude)
            
            # Calculate acceleration with non-linear components
            acc_x = (effective_spring * dx - effective_damping * velocity.x + noise_x) / mass
            acc_y = (effective_spring * dy - effective_damping * velocity.y + noise_y) / mass
            
            # Update velocity
            velocity.x += acc_x * time_step
            velocity.y += acc_y * time_step
            
            # Update position
            position.x += velocity.x * time_step
            position.y += velocity.y * time_step
            
            # Add to path
            path.append(Point(position.x, position.y))
            
            # Check if we're close enough to target and almost stopped
            if distance < stopping_threshold and speed < stopping_threshold:
                break
        
        return path

class VelocityProfiler:
    """Applies velocity profiles to reparameterize paths"""
    
    @staticmethod
    def resample_path(path: List[Point], num_points: int) -> List[Point]:
        """Resample a path to have uniform spatial distribution"""
        if len(path) <= 1 or num_points <= 1:
            return path
        
        result = [path[0]]
        
        # Calculate the path length
        path_lengths = [0]
        total_length = 0
        
        for i in range(1, len(path)):
            dx = path[i].x - path[i-1].x
            dy = path[i].y - path[i-1].y
            segment_length = math.sqrt(dx**2 + dy**2)
            
            total_length += segment_length
            path_lengths.append(total_length)
        
        # Generate evenly spaced points
        for i in range(1, num_points - 1):
            target_length = (i / (num_points - 1)) * total_length
            
            # Find the segment that contains the target length
            segment_index = 0
            while (segment_index < len(path_lengths) - 1 and 
                  path_lengths[segment_index + 1] < target_length):
                segment_index += 1
            
            # Calculate the fraction of the way through the segment
            segment_start = path_lengths[segment_index]
            segment_end = path_lengths[segment_index + 1]
            segment_fraction = 0
            
            if segment_end > segment_start:
                segment_fraction = (target_length - segment_start) / (segment_end - segment_start)
            
            # Interpolate between the points
            p1 = path[segment_index]
            p2 = path[segment_index + 1]
            
            result.append(Point(
                p1.x + segment_fraction * (p2.x - p1.x),
                p1.y + segment_fraction * (p2.y - p1.y)
            ))
        
        # Add the last point
        result.append(path[-1])
        
        return result
    
    @staticmethod
    def generate_time_values(num_points: int, velocity_profile: str) -> List[float]:
        """Generate time values based on the velocity profile"""
        time_values = [0]
        
        for i in range(1, num_points - 1):
            t = i / (num_points - 1)
            adjusted = t
            
            if velocity_profile == "minimum_jerk":
                # Minimum jerk profile: slow start, fast middle, slow end
                adjusted = t**3 * (10 - 15*t + 6*t**2)
            elif velocity_profile == "asymmetric":
                # Asymmetric profile: fast acceleration, slower deceleration
                a, b = 1.8, 2.2  # Shape parameters
                adjusted = t**a / (t**a + (1-t)**b)
            elif velocity_profile == "sigmoid":
                # Sigmoid profile: smooth acceleration and deceleration
                adjusted = 1 / (1 + math.exp(-12 * (t - 0.5)))
            
            time_values.append(adjusted)
        
        time_values.append(1)
        return time_values
    
    @staticmethod
    def apply_velocity_profile(path: List[Point], velocity_profile: str, 
                              num_points: int) -> List[Point]:
        """Apply a velocity profile to reparameterize a path"""
        # If profile is uniform or path is too short, return the path
        if velocity_profile == "uniform" or len(path) <= 1 or num_points <= 1:
            if len(path) == num_points:
                return path
            else:
                return VelocityProfiler.resample_path(path, num_points)
        
        # First resample the path to get uniform spatial distribution
        uniform_path = VelocityProfiler.resample_path(path, num_points)
        
        # Generate time values based on the velocity profile
        time_values = VelocityProfiler.generate_time_values(num_points, velocity_profile)
        
        # Reparameterize the path
        result = []
        
        for t in time_values:
            path_idx = t * (len(uniform_path) - 1)
            idx = int(path_idx)
            fraction = path_idx - idx
            
            # If we're at the last point, just use it
            if idx >= len(uniform_path) - 1:
                result.append(uniform_path[-1])
                continue
            
            # Otherwise, linearly interpolate
            p1 = uniform_path[idx]
            p2 = uniform_path[idx + 1]
            
            result.append(Point(
                p1.x + fraction * (p2.x - p1.x),
                p1.y + fraction * (p2.y - p1.y)
            ))
        
        return result

# Create Flask app
app = Flask(__name__)

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"}), 200

# Bézier curve endpoint
@app.route('/api/bezier', methods=['POST'])
def generate_bezier_curve():
    try:
        start_time = time.time()
        data = request.json
        
        # Extract parameters
        p0 = Point.from_dict(data['p0'])
        p1 = Point.from_dict(data['p1'])
        p2 = Point.from_dict(data['p2'])
        p3 = Point.from_dict(data['p3'])
        num_points = data['numPoints']
        
        # Generate curve
        path = BezierCurveGenerator.generate_curve(p0, p1, p2, p3, num_points)
        
        # Convert to dictionary for JSON
        result = [p.to_dict() for p in path]
        
        logger.info(f"Generated Bézier curve with {num_points} points in {time.time() - start_time:.3f}s")
        return jsonify({"path": result}), 200
    
    except Exception as e:
        logger.error(f"Error in generate_bezier_curve: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Minimum-jerk trajectory endpoint
@app.route('/api/minimum-jerk', methods=['POST'])
def generate_minimum_jerk_trajectory():
    try:
        start_time = time.time()
        data = request.json
        
        # Extract parameters
        start = Point.from_dict(data['start'])
        end = Point.from_dict(data['end'])
        num_points = data['numPoints']
        
        # Check for two-phase flag and overshoot
        two_phase = data.get('twoPhase', False)
        overshoot_factor = data.get('overshootFactor', 0.0)
        seed = data.get('randomSeed')
        
        # Generate path
        if two_phase and overshoot_factor > 0:
            path = MinimumJerkGenerator.generate_two_phase_path(
                start, end, overshoot_factor, num_points, seed
            )
        else:
            path = MinimumJerkGenerator.generate_path(start, end, num_points)
        
        # Convert to dictionary for JSON
        result = [p.to_dict() for p in path]
        
        logger.info(f"Generated minimum-jerk trajectory with {num_points} points in {time.time() - start_time:.3f}s")
        return jsonify({"path": result}), 200
    
    except Exception as e:
        logger.error(f"Error in generate_minimum_jerk_trajectory: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Ornstein-Uhlenbeck process endpoint
@app.route('/api/ou-process', methods=['POST'])
def generate_ornstein_uhlenbeck_process():
    try:
        start_time = time.time()
        data = request.json
        
        # Extract parameters
        points = data['points']
        theta = data['theta']
        sigma = data['sigma']
        dt = data['dt']
        seed = data.get('randomSeed')
        
        # Check for position-dependent flag
        position_dependent = data.get('positionDependent', False)
        
        # Generate process
        if position_dependent:
            theta_base = data.get('thetaBase', theta)
            theta_scale = data.get('thetaScale', 0.5)
            sigma_base = data.get('sigmaBase', sigma)
            sigma_scale = data.get('sigmaScale', 0.3)
            
            jitter_x, jitter_y = OrnsteinUhlenbeckProcess.generate_position_dependent_process(
                points, theta_base, theta_scale, sigma_base, sigma_scale, dt, seed
            )
        else:
            jitter_x, jitter_y = OrnsteinUhlenbeckProcess.generate_process(
                points, theta, sigma, dt, seed
            )
        
        logger.info(f"Generated OU process with {points} points in {time.time() - start_time:.3f}s")
        return jsonify({
            "jitterX": jitter_x,
            "jitterY": jitter_y
        }), 200
    
    except Exception as e:
        logger.error(f"Error in generate_ornstein_uhlenbeck_process: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Physics simulation endpoint
@app.route('/api/physics', methods=['POST'])
def simulate_physics_movement():
    try:
        start_time = time.time()
        data = request.json
        
        # Extract parameters
        start = Point.from_dict(data['start'])
        end = Point.from_dict(data['end'])
        options = data['options']
        
        # Extract physics parameters
        mass = options.get('mass', 1.0)
        spring_constant = options.get('springConstant', 8.0)
        damping_factor = options.get('dampingFactor', 0.7)
        time_step = options.get('timeStep', 0.016)
        max_steps = options.get('maxSteps', 1000)
        stopping_threshold = options.get('stoppingThreshold', 0.1)
        seed = options.get('randomSeed')
        
        # Check for non-linear model flag
        use_nonlinear = options.get('nonlinear', False)
        
        # Simulate movement
        if use_nonlinear:
            path = PhysicsSimulator.simulate_nonlinear_movement(
                start, end, mass, spring_constant, damping_factor,
                time_step, max_steps, stopping_threshold, seed
            )
        else:
            path = PhysicsSimulator.simulate_movement(
                start, end, mass, spring_constant, damping_factor,
                time_step, max_steps, stopping_threshold, seed
            )
        
        # Convert to dictionary for JSON
        result = [p.to_dict() for p in path]
        
        logger.info(f"Simulated physics movement with {len(path)} points in {time.time() - start_time:.3f}s")
        return jsonify({"path": result}), 200
    
    except Exception as e:
        logger.error(f"Error in simulate_physics_movement: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Velocity profile endpoint
@app.route('/api/velocity-profile', methods=['POST'])
def apply_velocity_profile():
    try:
        start_time = time.time()
        data = request.json
        
        # Extract parameters
        path_data = data['path']
        velocity_profile = data['velocityProfile']
        num_points = data['numPoints']
        
        # Convert path to list of Point objects
        path = [Point.from_dict(p) for p in path_data]
        
        # Apply velocity profile
        reparameterized_path = VelocityProfiler.apply_velocity_profile(
            path, velocity_profile, num_points
        )
        
        # Convert to dictionary for JSON
        result = [p.to_dict() for p in reparameterized_path]
        
        logger.info(f"Applied velocity profile to {len(path)} points in {time.time() - start_time:.3f}s")
        return jsonify({"path": result}), 200
    
    except Exception as e:
        logger.error(f"Error in apply_velocity_profile: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Run the server if executed directly
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    logger.info(f"Starting math server on port {port}")
    app.run(host='0.0.0.0', port=port)