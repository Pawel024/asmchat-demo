from flask import Flask
from flask_cors import CORS
from utils.routes import init_routes
import os
from phoenix.otel import register

tracer_provider = register(
  project_name="default",
  endpoint="https://app.phoenix.arize.com/v1/traces"
)

app = Flask(__name__, static_folder='./static', static_url_path='/')
CORS(app)

# Initialize routes
init_routes(app)

if __name__ == '__main__':
    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    app.run(host=host, port=port)