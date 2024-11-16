If running locally, you need to add a .env file with a LLAMA_CLOUD_API_KEY and an OPENAI_API_KEY in the utils folder.

To start the local server, run the following command:

```bash
gunicorn --chdir /home/pawel/ASMChat/chat_demo/backend --timeout 120 wsgi:app
```

or alternatively:

```bash
flask run
```

The app will be available at [localhost:8000](http://localhost:8000).