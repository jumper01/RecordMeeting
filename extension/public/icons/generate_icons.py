#!/usr/bin/env python3
"""
Generate icon files for the RecordMeeting Chrome extension.
This script creates SVG icons of different sizes.
"""

import os

# SVG icon template
ICON_SVG = """<?xml version="1.0" encoding="UTF-8"?>
<svg width="{width}" height="{height}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="#FF4444" stroke-width="2"/>
  <circle cx="12" cy="12" r="5" fill="#FF4444"/>
</svg>
"""

def generate_icons():
    sizes = [16, 32, 48, 128]
    
    os.makedirs('icons', exist_ok=True)
    
    for size in sizes:
        svg_content = ICON_SVG.format(width=size, height=size)
        filename = f'icons/icon{size}.png'
        
        # For simplicity, we'll create SVG files
        # In a real implementation, you'd convert these to PNG
        svg_filename = f'icons/icon{size}.svg'
        with open(svg_filename, 'w') as f:
            f.write(svg_content)
        print(f'Created {svg_filename}')
    
    # Also create a simple SVG for the logo
    with open('icons/logo.svg', 'w') as f:
        f.write(ICON_SVG.format(width=128, height=128))
    print('Created icons/logo.svg')

if __name__ == '__main__':
    generate_icons()
    print('Icon generation complete!')
    print('Note: For Chrome extensions, you need PNG files.')
    print('You can convert these SVG files to PNG using an image editor or online tool.')
