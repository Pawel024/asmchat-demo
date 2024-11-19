import os
from flask import jsonify, request, render_template, Response
from utils.auth import requires_auth
from utils.chat_engine import read_data, create_chat_engine

topic = os.getenv('SPECIALIZATION_TOPIC', 'aerospace structures and materials')

chat_engine = create_chat_engine(read_data(), topic=topic)

def init_routes(app):

    @app.route('/')
    @requires_auth
    def serve_html() -> Response:
        """Serve the chat demo HTML file."""
        return render_template('chat_demo_template.html', topic=topic)

    @app.route('/chat', methods=['POST'])
    @requires_auth
    def chat() -> Response:
        """Send a chat input to the chat engine and return the response."""
        data = request.json
        user_input = data.get('input')
        
        # Process the input using your LlamaIndex chat engine
        response = str(chat_engine.chat(user_input))
        
        # Return the response in JSON format
        return jsonify({'key': 'response_key', 'content': response})