import os
from azure.storage.blob import BlobServiceClient
from llama_index.core import StorageContext, load_index_from_storage
from llama_index.core.memory import ChatMemoryBuffer
from utils.config import llm, parsed_dir, unparsed_dir, is_heroku
from backend.parse import parse_pdf
from utils.azure_utils import download_files_from_azure, upload_parsed_data_to_azure, list_files_in_directory
from llama_index.core import Settings

memory = ChatMemoryBuffer.from_defaults(token_limit=1000)
Settings.llm = llm

# Flags to check if processes have been completed
data_downloaded = False
data_parsed = False
data_uploaded = False

def read_data():
    """Read the parsed data from Azure Blob Storage or the local directory."""
    global data_downloaded, data_parsed, data_uploaded

    blob_service_client = None
    container_name = None

    # Download the parsed data from Azure Blob Storage if running on Heroku
    if is_heroku and not data_downloaded:
        # Ensure parsed_dir exists
        os.makedirs(parsed_dir, exist_ok=True)
        blob_service_client = BlobServiceClient.from_connection_string(os.getenv('AZURE_STORAGE_CONNECTION_STRING'))
        parsed_container_name = os.getenv('PARSED_AZURE_CONTAINER_NAME')
        download_files_from_azure(blob_service_client, container_name, parsed_dir)
        data_downloaded = True

    # Check if parsed data already exists
    if os.path.exists(parsed_dir) and os.listdir(parsed_dir):
        storage_context = StorageContext.from_defaults(persist_dir=parsed_dir)
        index = load_index_from_storage(storage_context)
        print("\nFound parsed data, skipping parsing!\n\n")
    else:
        # Download the PDF from OneDrive if running on Heroku
        if is_heroku and not data_parsed:
            unparsed_container_name = os.getenv('UNPARSED_AZURE_CONTAINER_NAME')
            download_files_from_azure(blob_service_client, container_name, unparsed_dir)

        # Parse the PDF and store the parsed data
        index = parse_pdf(unparsed_dir, store=True, persist_dir=parsed_dir)
        data_parsed = True

        print("\n")
        list_files_in_directory(parsed_dir)

        # Upload the parsed data to Azure Blob Storage for future use
        if is_heroku and not data_uploaded:
            upload_parsed_data_to_azure(blob_service_client, parsed_container_name, parsed_dir)
            data_uploaded = True
    
    print("--- Data setup finished! ---\n\n")

    return index

def create_chat_engine(index, topic="aerospace structures and materials"):
    """Create a chat engine using the LlamaIndex chat engine."""
    # make a chat engine
    chat_engine_ = index.as_chat_engine(chat_mode="condense_plus_context",
                                       memory=memory,
                                       context_prompt=(
        "You are ASM Chatbot, a helpful studying assistant able to have normal interactions,"
        f" as well as explain concepts in {topic}. " 
        "Here are the relevant documents for the context:\n"
        "{context_str}"
        "\nInstruction: Use the previous chat history, or the context above, to interact and help the user."
        " Format your responses in markdown. If providing equations, use $$ as delimiters for block formulas, e.g. $$1+1 = 2$$."
        " For inline math, always use $ as the delimiter, written directly before and directly after the expression."
        " Never put spaces between the $ and the expression, e.g. $1 + 1 = 2$ is okay, but $ 1 + 1 = 2 $ is not."
        " If providing code, do so in the following format: ```<name of language>\n<your code here>\n```, e.g. ```python\nprint('Hello, World!')\n```."
        " If you can't provide an absolutely confident answer, say 'Sorry, I don't know that' instead."
        " If a question cannot be answered using the context (the book), say 'Sorry, I can't help with that."
        " Do not answer questions about topics not covered in the book even if you are confident about the answer."
        " The only exception is if they could be considered general knowledge, e.g. you can answer 'What is the formula for the area of a circle?'"
        " Never lie. Never be rude."
    ))
    return chat_engine_