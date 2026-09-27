import pygame
from chain import Chain, Point
import time
import random
import sys

# 1. Create the main window
pygame.init()


# 2. Create a Canvas widget
WIDTH, HEIGHT = 800, 600
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("My Pygame Display") # Set window title


# 3. Draw a rectangle on the canvas
# Coordinates (x1, y1, x2, y2) define the top-left and bottom-right corners

def create_circle(canvas, x, y, r, **kwargs):
    x0 = x - r
    y0 = y - r
    x1 = x + r
    y1 = y + r
    return canvas.create_oval(x0, y0, x1, y1, **kwargs)


shape = [i for i in range(30, 2, -3)]
chain = Chain(shape)


running = True

while running:
    screen.fill((255, 255, 255)) # Fill the screen with white (RGB tuple)
    for i in range(chain.n):
        pos, constraint = chain.position[i], chain.shape[i]
        pygame.draw.circle(screen, "black", (pos.x, pos.y), constraint, width=1)
    pygame.display.update()
    pygame.event.get()
    mouse_x, mouse_y = pygame.mouse.get_pos()
    # print(mouse_x, mouse_y)
    direction = (Point(mouse_x, mouse_y)- chain.position[0]).unit()* 5 if (Point(mouse_x, mouse_y)- chain.position[0]).magnitude() > 3 else Point(0, 0)
    chain.position[0] += direction
    chain.update()
    time.sleep(0.05)

# Quit Pygame and Python
pygame.quit()
sys.exit()