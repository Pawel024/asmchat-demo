import os.path
from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    StorageContext,
    load_index_from_storage,
)
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings
from parse import parse_pdf
from flask import Flask, jsonify, request
from flask_cors import CORS

llm = OpenAI(model="gpt-4o")

Settings.llm = llm
input_files = ['data_unparsed/Aerodynamics_and_Aircraft_Performance_3e.pdf']
PERSIST_DIR = "./data"


def read_data():
    # load the existing index if data folder not empty, otherwise not run parse.py
    if os.path.exists(PERSIST_DIR) and os.listdir(PERSIST_DIR):
        storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
        index = load_index_from_storage(storage_context)
    else:
        index = parse_pdf(input_files, store=True)


    # make a chat engine
    chat_engine = index.as_query_engine(chat_mode="condense_question", verbose=True)
    return chat_engine

app = Flask(__name__)
CORS(app)

chat_engine = read_data()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('input')
    
    # Process the input using your LlamaIndex chat engine
    response = str(chat_engine.query(user_input))
    
    # Return the response in JSON format
    return jsonify({'key': 'response_key', 'content': response})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)