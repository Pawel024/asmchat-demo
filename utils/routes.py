from flask import jsonify, request, send_from_directory, Response
from auth import requires_auth
from chat_engine import read_data, create_chat_engine

chat_engine = create_chat_engine(read_data())

def init_routes(app):
    @app.route('/')
    @requires_auth
    def serve_html() -> Response:
        """Serve the chat demo HTML file."""
        return send_from_directory(app.static_folder, 'chat_demo.html')

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