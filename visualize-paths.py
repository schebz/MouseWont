#!/usr/bin/env python3
"""
Path Visualization Script

Visualises different mouse movement paths from the generated JSON file
"""

import json
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.animation import FuncAnimation
import sys
from pathlib import Path

# Load the generated path data
def load_paths(file_path="path-samples.json"):
    with open(file_path, 'r') as f:
        return json.load(f)

# Set up the plot for a specific point pair
def setup_plot(point_pair_index, paths, plot_title="Mouse Movement Paths"):
    # Filter paths for the specified point pair
    pair_paths = [p for p in paths if p["pairIndex"] == point_pair_index]
    
    if not pair_paths:
        print(f"No paths found for point pair index {point_pair_index}")
        return None, None, None
    
    # Get start and end points (same for all paths in this pair)
    start = pair_paths[0]["start"]
    end = pair_paths[0]["end"]
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_title(f"{plot_title} - Pair {point_pair_index+1} - Distance: {pair_paths[0]['distance']:.1f}px")
    
    # Add labels and grid
    ax.set_xlabel("X Position (pixels)")
    ax.set_ylabel("Y Position (pixels)")
    ax.grid(alpha=0.3)
    
    # Plot start and end points
    ax.plot(start["x"], start["y"], 'go', markersize=10, label="Start")
    ax.plot(end["x"], end["y"], 'ro', markersize=10, label="End")
    
    # Initialize lines for each path
    lines = []
    for path_data in pair_paths:
        model = path_data["model"]
        variant = path_data["variant"]
        
        # Choose line style and color based on model and variant
        if model == "Bezier":
            color = 'blue'
            linestyle = '-'
        elif model == "BezierHigh":
            if variant == "original":
                color = 'cyan'
                linestyle = '-'
            else:  # jittered
                color = 'cyan'
                linestyle = ':'
        elif model == "Physics":
            color = 'green'
            linestyle = '-'
        elif model == "PhysicsLowDamping":
            color = 'lime'
            linestyle = '-'
        elif model == "MinimumJerk":
            color = 'red'
            linestyle = '-'
        else:
            color = 'black'
            linestyle = '--'
        
        # Create empty line
        line, = ax.plot([], [], linestyle=linestyle, color=color, 
                        label=f"{model} ({variant})" if variant != "original" else model)
        lines.append((line, path_data))
    
    ax.legend()
    
    return fig, ax, lines

# Animate the paths
def animate_paths(fig, ax, lines, interval=50, frames=100):
    def init():
        for line, _ in lines:
            line.set_data([], [])
        return [line for line, _ in lines]
    
    def animate(frame_idx):
        # Calculate percentage of animation complete
        progress = frame_idx / frames
        
        for line, path_data in lines:
            # Get points up to current progress
            path = path_data["path"]
            max_points = len(path)
            current_points = min(max_points, int(progress * max_points))
            
            # Set line data
            x = [point["x"] for point in path[:current_points]]
            y = [point["y"] for point in path[:current_points]]
            line.set_data(x, y)
        
        return [line for line, _ in lines]
    
    ani = FuncAnimation(
        fig, animate, frames=frames,
        init_func=init, blit=True, interval=interval
    )
    
    return ani

# Generate static plots for all point pairs
def generate_static_plots(paths, output_dir="output"):
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(exist_ok=True)
    
    # Get unique point pair indices
    pair_indices = sorted(set(p["pairIndex"] for p in paths))
    
    for idx in pair_indices:
        fig, ax, lines = setup_plot(idx, paths)
        
        if not lines:
            continue
        
        # Plot the full paths
        for line, path_data in lines:
            path = path_data["path"]
            x = [point["x"] for point in path]
            y = [point["y"] for point in path]
            line.set_data(x, y)
        
        # Adjust axes to show all paths
        ax.autoscale_view()
        
        # Save the figure
        plt.tight_layout()
        plt.savefig(f"{output_dir}/path_pair_{idx+1}.png", dpi=150)
        plt.close(fig)
    
    print(f"Static plots saved to {output_dir}/")

# Generate animated GIFs for all point pairs
def generate_animations(paths, output_dir="output"):
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(exist_ok=True)
    
    # Get unique point pair indices
    pair_indices = sorted(set(p["pairIndex"] for p in paths))
    
    for idx in pair_indices:
        fig, ax, lines = setup_plot(idx, paths, "Mouse Movement Animation")
        
        if not lines:
            continue
        
        # Calculate axis limits based on all points
        all_points = []
        for _, path_data in lines:
            all_points.extend(path_data["path"])
        
        x_coords = [p["x"] for p in all_points]
        y_coords = [p["y"] for p in all_points]
        
        # Add margins
        x_margin = (max(x_coords) - min(x_coords)) * 0.1
        y_margin = (max(y_coords) - min(y_coords)) * 0.1
        
        ax.set_xlim(min(x_coords) - x_margin, max(x_coords) + x_margin)
        ax.set_ylim(min(y_coords) - y_margin, max(y_coords) + y_margin)
        
        # Create animation
        ani = animate_paths(fig, ax, lines, interval=30, frames=120)
        
        # Save animation
        ani.save(f"{output_dir}/path_animation_{idx+1}.gif", writer='pillow', fps=30, dpi=100)
        plt.close(fig)
    
    print(f"Animations saved to {output_dir}/")

# Main function
def main():
    # Create output directory if needed
    Path("output").mkdir(exist_ok=True)
    
    try:
        # Load path data
        paths = load_paths()
        
        # Generate plots
        print(f"Loaded {len(paths)} path samples")
        generate_static_plots(paths)
        
        # Generate animations if requested
        if len(sys.argv) > 1 and sys.argv[1] == '--animate':
            generate_animations(paths)
        
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())