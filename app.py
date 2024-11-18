from flask import Flask
from flask_cors import CORS
from utils.routes import init_routes
import os
from phoenix.otel import register
from openinference.instrumentation.llama_index import LlamaIndexInstrumentor
from openinference.instrumentation.openai import OpenAIInstrumentor
from llama_index.core.callbacks import CallbackManager
from llama_index.callbacks.wandb import WandbCallbackHandler
from llama_index.core import Settings

tracer_provider = register(
  project_name="default",
  endpoint="https://app.phoenix.arize.com/v1/traces"
)

LlamaIndexInstrumentor().instrument(tracer_provider=tracer_provider)
OpenAIInstrumentor().instrument(tracer_provider=tracer_provider)

# initialise WandbCallbackHandler and pass any wandb.init args
wandb_args = {"project":"asm-chat"}
wandb_callback = WandbCallbackHandler(run_args=wandb_args)

# pass wandb_callback to the settings
callback_manager = CallbackManager([wandb_callback])
Settings.callback_manager = callback_manager

app = Flask(__name__, static_folder='./static', static_url_path='/')
CORS(app)

# Initialize routes
init_routes(app)

if __name__ == '__main__':
    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    app.run(host=host, port=port)