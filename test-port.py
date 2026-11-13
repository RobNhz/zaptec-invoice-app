#!/usr/bin/env python
import socket

# Try to connect to port 8000
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
result = s.connect_ex(('127.0.0.1', 8000))
if result == 0:
    print("Port 8000 is OPEN and accepting connections")
    s.close()
else:
    print(f"Port 8000 is CLOSED or refusing connections (error code: {result})")
