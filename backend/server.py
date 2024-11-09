import os.path
from llama_index.core import (
    StorageContext,
    load_index_from_storage,
)
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings
from llama_index.core.memory import ChatMemoryBuffer

memory = ChatMemoryBuffer.from_defaults(token_limit=1000)

from parse import parse_pdf

from flask import Flask, jsonify, request
from flask_cors import CORS

llm = OpenAI(model="gpt-4o-mini")

Settings.llm = llm
input_files = ['data_unparsed/Alderliesten+-+Introduction+to+Aerospace+Structures+and+Materials.pdf']
PERSIST_DIR = "./data"


def read_data():
    # load the existing index if data folder not empty, otherwise not run parse.py
    if os.path.exists(PERSIST_DIR) and os.listdir(PERSIST_DIR):
        storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
        index = load_index_from_storage(storage_context)
    else:
        index = parse_pdf(input_files, store=True)


    # make a chat engine
    chat_engine = index.as_chat_engine(chat_mode="condense_plus_context",
                                       memory=memory,
                                       context_prompt=(
        "You are ASM Chatbot, a helpful studying assistant able to have normal interactions,"
        " as well as explain concepts in Aerodynamics and Aircraft Performance. " 
        "Here are the relevant documents for the context:\n"
        "{context_str}"
        "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
        " Put all equations in TeX format. If you can't provide a confident answer, say 'Sorry, I don't know that' instead."
        " If a question is not directly related to the context, say 'Sorry, I can't help with that."
        " Never say something you are not absolutely confident about. Never lie. Never be rude."
    ))
    return chat_engine

app = Flask(__name__)
CORS(app)

chat_engine = read_data()

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get('input')
    
    # Process the input using your LlamaIndex chat engine
    response = str(chat_engine.chat(user_input))
    
    # Return the response in JSON format
    return jsonify({'key': 'response_key', 'content': response})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)