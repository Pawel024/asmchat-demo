from dotenv import load_dotenv
load_dotenv()

# bring in deps
from llama_parse import LlamaParse
from llama_index.core import SimpleDirectoryReader
from llama_index.core import VectorStoreIndex

import os

parser = LlamaParse(
    result_type="markdown",  # "markdown" and "text" are available
)

def parse_pdf(input_files, store=False):
    # use SimpleDirectoryReader to parse our file
    file_extractor = {".pdf": parser}
    documents = SimpleDirectoryReader(input_files=input_files, file_extractor=file_extractor).load_data()

    index = VectorStoreIndex.from_documents(documents)

    # store it for later if store==True
    PERSIST_DIR = "./data"
    if store:
        index.storage_context.persist(persist_dir=PERSIST_DIR)
    return index