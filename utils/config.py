import os
from llama_index.llms.openai import OpenAI

# Check if running on Heroku
is_heroku = os.getenv('DYNO') is not None
print(f'Running on Heroku: {is_heroku}')

if is_heroku:
    openai_api_key = os.getenv('OPENAI_API_KEY')
    llm = OpenAI(api_key=openai_api_key, model="gpt-4o-mini")
else:
    llm = OpenAI(model="gpt-4o-mini")

if is_heroku:
    input_files = ['backend/data_unparsed/Alderliesten+-+Introduction+to+Aerospace+Structures+and+Materials.pdf']
    persist_dir = "backend/data"
else:
    persist_dir = "../backend/data"
    input_files = ['../backend/data_unparsed/Alderliesten+-+Introduction+to+Aerospace+Structures+and+Materials.pdf']