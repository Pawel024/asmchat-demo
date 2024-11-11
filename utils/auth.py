import os
from flask import request, Response
from functools import wraps
from utils.config import is_heroku

# Basic Authentication
def check_auth(username: str, password: str) -> bool:
    """Check if the username and password are correct."""
    if is_heroku:
        return (username == os.getenv('BASIC_AUTH_USERNAME') and password == os.getenv('BASIC_AUTH_PASSWORD')) or \
               (username == os.getenv('BASIC_AUTH_USERNAME_2') and password == os.getenv('BASIC_AUTH_PASSWORD_2'))
    else:
        return username == 'admin' and password == 'admin'

def authenticate() -> Response:
    """Send a 401 response that enables basic auth."""
    return Response(
        'Could not verify your access level for that URL.\n'
        'You have to login with proper credentials', 401,
        {'WWW-Authenticate': 'Basic realm="Login Required"'})

def requires_auth(f: callable) -> callable:
    @wraps(f)
    def decorated(*args, **kwargs):
        """Check if the user is authenticated."""
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated