import os
import requests
from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from functools import wraps
from llama_index.core import (
    StorageContext,
    load_index_from_storage,
)
from llama_index.llms.openai import OpenAI
from llama_index.core import Settings
from llama_index.core.memory import ChatMemoryBuffer

memory = ChatMemoryBuffer.from_defaults(token_limit=1000)

from backend.parse import parse_pdf

from azure.storage.blob import BlobServiceClient

# Check if running on Heroku
is_heroku = os.getenv('DYNO') is not None
print(f'Running on Heroku: {is_heroku}')

if is_heroku:
    openai_api_key = os.getenv('OPENAI_API_KEY')
    llm = OpenAI(api_key=openai_api_key, model="gpt-4o-mini")
else:
    llm = OpenAI(model="gpt-4o-mini")

Settings.llm = llm
input_files = ['data_unparsed/Alderliesten+-+Introduction+to+Aerospace+Structures+and+Materials.pdf']
PERSIST_DIR = "./data"

def download_file_from_onedrive(onedrive_link, local_path):
    try:
        response = requests.get(onedrive_link)
        response.raise_for_status()
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'wb') as file:
            file.write(response.content)
    except requests.RequestException as e:
        print(f"Error downloading file from OneDrive: {e}")

def download_parsed_data_from_azure(blob_service_client, container_name, local_dir):
    try:
        print(f"Downloading parsed data from Azure Blob Storage container '{container_name}' to '{local_dir}'")
        container_client = blob_service_client.get_container_client(container_name)
        blobs = container_client.list_blobs()
        for blob in blobs:
            blob_client = container_client.get_blob_client(blob)
            local_file_path = os.path.join(local_dir, blob.name)
            os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
            with open(local_file_path, 'wb') as file:
                file.write(blob_client.download_blob().readall())
    except Exception as e:
        print(f"Error downloading parsed data from Azure: {e}")

def upload_parsed_data_to_azure(blob_service_client, container_name, local_dir):
    try:
        container_client = blob_service_client.get_container_client(container_name)
        for root, dirs, files in os.walk(local_dir):
            for file_name in files:
                file_path = os.path.join(root, file_name)
                blob_name = os.path.relpath(file_path, local_dir)
                blob_client = container_client.get_blob_client(blob_name)
                with open(file_path, 'rb') as file:
                    blob_client.upload_blob(file, overwrite=True)
    except Exception as e:
        print(f"Error uploading parsed data to Azure: {e}")

def read_data():

    # Download the parsed data from Azure Blob Storage if running on Heroku
    if is_heroku:
        # Ensure PERSIST_DIR exists
        os.makedirs(PERSIST_DIR, exist_ok=True)
        blob_service_client = BlobServiceClient.from_connection_string(os.getenv('AZURE_STORAGE_CONNECTION_STRING'))
        container_name = os.getenv('AZURE_CONTAINER_NAME')
        download_parsed_data_from_azure(blob_service_client, container_name, PERSIST_DIR)

    # Check if parsed data already exists
    if os.path.exists(PERSIST_DIR) and os.listdir(PERSIST_DIR):
        storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
        index = load_index_from_storage(storage_context)
    else:
        # Download the PDF from OneDrive if running on Heroku
        if is_heroku:
            onedrive_link = os.getenv('ONEDRIVE_LINK')
            local_path = 'data_unparsed/Alderliesten+-+Introduction+to+Aerospace+Structures+and+Materials.pdf'
            download_file_from_onedrive(onedrive_link, local_path)

        # Parse the PDF and store the parsed data
        input_files = ['data_unparsed/Alderliesten+-+Introduction+to+Aerospace+Structures+and+Materials.pdf']
        index = parse_pdf(input_files, store=True)

        # Upload the parsed data to Azure Blob Storage for future use
        if is_heroku:
            upload_parsed_data_to_azure(blob_service_client, container_name, PERSIST_DIR)
    
    return index

def create_chat_engine(index):
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

app = Flask(__name__, static_folder='../demo', static_url_path='/')
CORS(app)

chat_engine = create_chat_engine(read_data())

# Basic Authentication
def check_auth(username, password):
    if is_heroku:
        return (username == os.getenv('BASIC_AUTH_USERNAME') and password == os.getenv('BASIC_AUTH_PASSWORD')) or \
               (username == os.getenv('BASIC_AUTH_USERNAME_2') and password == os.getenv('BASIC_AUTH_PASSWORD_2'))
    else:
        return username == 'admin' and password == 'admin'

def authenticate():
    return Response(
        'Could not verify your access level for that URL.\n'
        'You have to login with proper credentials', 401,
        {'WWW-Authenticate': 'Basic realm="Login Required"'})

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

@app.route('/')
@requires_auth
def serve_html():
    return send_from_directory(app.static_folder, 'chat_demo.html')

@app.route('/chat', methods=['POST'])
@requires_auth
def chat():
    data = request.json
    user_input = data.get('input')
    
    # Process the input using your LlamaIndex chat engine
    response = str(chat_engine.chat(user_input))
    
    # Return the response in JSON format
    return jsonify({'key': 'response_key', 'content': response})

if __name__ == '__main__':
    host = os.getenv('FLASK_RUN_HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 5000))
    app.run(host=host, port=port)