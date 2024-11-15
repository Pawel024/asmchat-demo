import os
from llama_index.llms.openai import OpenAI

# Check if running on Heroku
is_heroku = os.getenv('DYNO') is not None
print(f'\n\nRunning on Heroku: {is_heroku}')

if is_heroku:
    openai_api_key = os.getenv('OPENAI_API_KEY')
    llm = OpenAI(api_key=openai_api_key, model="gpt-4o-mini")
else:
    llm = OpenAI(model="gpt-4o-mini")

if is_heroku:
    parsed_dir = "backend/data"
    unparsed_dir = "backend/data_unparsed"

else:
    parsed_dir = "../backend/data"
    unparsed_dir = "../backend/data_unparsed"