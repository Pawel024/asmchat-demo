from dotenv import load_dotenv
load_dotenv()

# bring in deps
from llama_parse import LlamaParse, ResultType
from llama_index.core import SimpleDirectoryReader
from llama_index.core import VectorStoreIndex

import os

# Check if running on Heroku
is_heroku = os.getenv('DYNO') is not None

if is_heroku:
    llama_cloud_api_key = os.getenv('LLAMA_CLOUD_API_KEY')
    parser = LlamaParse(
        result_type=ResultType.MD,  # "markdown" and "text" are available
        api_key=llama_cloud_api_key
    )
else:
    parser = LlamaParse(
        result_type=ResultType.MD,  # "markdown" and "text" are available
    )

def parse_pdf(input_dir, store=False, persist_dir='./data'):
    # use SimpleDirectoryReader to parse our file
    file_extractor = {".pdf": parser}
    documents = SimpleDirectoryReader(input_dir=input_dir, file_extractor=file_extractor).load_data()

    index = VectorStoreIndex.from_documents(documents)

    # store it for later if store==True
    if store:
        index.storage_context.persist(persist_dir=persist_dir)
    return index