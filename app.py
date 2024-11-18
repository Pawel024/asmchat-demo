from flask import Flask
from flask_cors import CORS
from utils.routes import init_routes
import os
from openinference.semconv.resource import ResourceAttributes
from openinference.instrumentation.llama_index import LlamaIndexInstrumentor
from opentelemetry import trace as trace_api
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk import trace as trace_sdk
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import SimpleSpanProcessor

resource = Resource(attributes={
    ResourceAttributes.PROJECT_NAME: "default"
})
tracer_provider = trace_sdk.TracerProvider(resource=resource)
span_exporter = OTLPSpanExporter(endpoint="http://phoenix:6006/v1/traces")
span_processor = SimpleSpanProcessor(span_exporter=span_exporter)
tracer_provider.add_span_processor(span_processor=span_processor)
trace_api.set_tracer_provider(tracer_provider=tracer_provider)

LlamaIndexInstrumentor().instrument()

app = Flask(__name__, static_folder='./static', static_url_path='/')
CORS(app)

# Initialize routes
init_routes(app)

if __name__ == '__main__':
    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    app.run(host=host, port=port)