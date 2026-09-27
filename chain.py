from typing import List
from math import sqrt


class Point:
    def __init__(self, x, y):
        assert type(x) in [int, float, complex] and type(y) in [int, float, complex]
        self.x = x
        self.y = y
    
    def magnitude(self)->float:
        return sqrt(pow(self.x, 2)+pow(self.y, 2))

    def unit(self):
        mag = self.magnitude()
        return Point(self.x/mag, self.y/mag)

    
    def __mul__(self, other):
        if type(other) in [int, float, complex]:
            return Point(self.x*other, self.y*other)
        raise Exception
    
    def __sub__(self, other):
        if type(other) == Point:
            return Point(self.x-other.x, self.y-other.y)
        raise Exception

    def __add__(self, other):
        if type(other) == Point:
            return Point(self.x+other.x, self.y+other.y)
        raise Exception


class Chain:
    def __init__(self, shape: List[float], position:List[List[float]]=None):
        self.n = len(shape)
        self.shape = shape
        self.position = self.generate_position(shape) if not position else [Point(x, y) for x, y in position]
        assert len(self.position) == len(self.shape)
        self.update()
    
    def generate_position(self, shape)->List[List[float]]:
        pos_x, pos_y = 200, 200
        new_shape = [Point(pos_x, pos_y)]
        for r in shape[:-1]:
            pos_y += r
            new_shape.append(Point(pos_x, pos_y))
        return new_shape
    

    def enforce_constraint(self, pos1: Point, pos2: Point, constraint: float)->Point:
        distance_vec = (pos2-pos1).unit()*constraint
        return pos1+distance_vec

    def update(self)->None:
        for i in range(1, self.n):
            if (self.position[i]-self.position[i-1]).magnitude() <= self.shape[i-1]:
                continue
            self.position[i] = self.enforce_constraint(self.position[i-1], self.position[i], self.shape[i-1])
        