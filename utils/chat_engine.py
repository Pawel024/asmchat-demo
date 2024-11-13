import threading
import os
import logging
from azure.storage.blob import BlobServiceClient
from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.memory import ChatMemoryBuffer
from utils.config import llm, input_files, PERSIST_DIR, is_heroku
from backend.parse import parse_pdf
from utils.azure_utils import download_parsed_data_from_azure, upload_parsed_data_to_azure, download_file_from_onedrive
from llama_index.core import Settings

logging.basicConfig(level=logging.INFO)

memory = ChatMemoryBuffer.from_defaults(token_limit=1000)
Settings.llm = llm

# Create a lock for synchronization
lock = threading.Lock()

# Flags to check if processes have been completed
data_downloaded = False
data_parsed = False
data_uploaded = False

def read_data():
    """Read the parsed data from Azure Blob Storage or the local directory."""
    global data_downloaded, data_parsed, data_uploaded

    with lock:
        blob_service_client = None
        container_name = None

        # Download the parsed data from Azure Blob Storage if running on Heroku
        if is_heroku and not data_downloaded:
            # Ensure PERSIST_DIR exists
            os.makedirs(PERSIST_DIR, exist_ok=True)
            blob_service_client = BlobServiceClient.from_connection_string(os.getenv('AZURE_STORAGE_CONNECTION_STRING'))
            container_name = os.getenv('AZURE_CONTAINER_NAME')
            download_parsed_data_from_azure(blob_service_client, container_name, PERSIST_DIR)
            data_downloaded = True

        # Check if parsed data already exists
        if os.path.exists(PERSIST_DIR) and os.listdir(PERSIST_DIR):
            storage_context = StorageContext.from_defaults(persist_dir=PERSIST_DIR)
            index = load_index_from_storage(storage_context)
        else:
            # Download the PDF from OneDrive if running on Heroku
            if is_heroku and not data_parsed:
                onedrive_link = os.getenv('ONEDRIVE_LINK')
                local_path = 'backend/data_unparsed/Alderliesten+-+Introduction+to+Aerospace+Structures+and+Materials.pdf'
                download_file_from_onedrive(onedrive_link, local_path)

            # Parse the PDF and store the parsed data
            index = parse_pdf(input_files, store=True)
            data_parsed = True

            # Upload the parsed data to Azure Blob Storage for future use
            if is_heroku and not data_uploaded:
                upload_parsed_data_to_azure(blob_service_client, container_name, PERSIST_DIR)
                data_uploaded = True

        return index

def create_chat_engine(index):
    """Create a chat engine using the LlamaIndex chat engine."""
    # make a chat engine
    chat_engine_ = index.as_chat_engine(chat_mode="condense_plus_context",
                                       memory=memory,
                                       context_prompt=(
        "You are ASM Chatbot, a helpful studying assistant able to have normal interactions,"
        " as well as explain concepts in aerospace structures and materials. " 
        "Here are the relevant documents for the context:\n"
        "{context_str}"
        "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
        " Format your responses in markdown. If providing code, do so in the following format:"
        " ```<name of language>\n<your code here>\n```, e.g. ```python\nprint('Hello, World!')\n```"
        " If If you can't provide an absolutely confident answer, say 'Sorry, I don't know that' instead."
        " If a question cannot be answered using the context (the book), say 'Sorry, I can't help with that."
        " Do not answer questions about topics not covered in the book even if you are confident about the answer."
        " The only exception is if they are general knowledge, e.g. you can answer 'What is the formula for the area of a circle?'"
        " Never lie. Never be rude."
    ))
    return chat_engine_