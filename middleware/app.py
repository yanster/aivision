import os
import uuid
import json
import threading
import requests

from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from flask import Flask
from flask import request
from flask_cors import CORS
from flask_compress import Compress

from openai import OpenAI
import base64
import requests
import replicate

from storage import save_to_bucket
from utils import save_json_to_file, file_to_base64_image, file_to_byte_array, generate_random_file_name


CLOUDFLARE_API_TOKEN=os.getenv('CLOUDFLARE_API_TOKEN')
CLOUDFLARE_API_BASE_URL = os.getenv('CLOUDFLARE_API_BASE_URL')
OPENAI_API_URL = os.getenv('OPENAI_API_URL')
S3_ENABLED = os.getenv('S3_ENABLED') == "false"
PURGE_CACHE = os.getenv('PURGE_CACHE') == "true"
REPLICATE_API_TOKEN = os.environ["REPLICATE_API_TOKEN"]

def describe_using_cloudflare(byte_array):

    image_array = list(byte_array)

    input = {
            "image": image_array,
            "prompt": "Describe what is in the image, be specific about direction where things are located.",
            "max_tokens": 1000
        }
    model = "@cf/unum/uform-gen2-qwen-500m"
    headers = {"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"}

    response = requests.post(f"{CLOUDFLARE_API_BASE_URL}/{model}", headers=headers, json=input)

    if (response.text == "Rate limited"):
        return "rate_limited"

    result = response.json()
    print(result)
    return result["result"]["description"]


def describe_using_replicate(base64_image):
    api = replicate.Client(api_token=os.environ["REPLICATE_API_TOKEN"])
    output = api.run(
        "yorickvp/llava-13b:a0fdc44e4f2e1f20f2bb4e27846899953ac8e66c5886c5878fa1d6b73ce009e5",
        input={
            "image": base64_image,
            "top_p": 1,
            "prompt": "You are an assistant blind people experience the world. Describe what you see in front of you.",
            "max_tokens": 1024,
            "temperature": 0.2
        }
    )

    result = ""
    for item in output:
        result = result + item

    return result

def describe_using_openai(base64_image):

    try:
        r = requests.get(OPENAI_API_URL + "/models", timeout=1)
        if r.status_code != 200:
            print("OpenAI API server down!")
            return
    except:
        print("OpenAI API server down!")
        return


    # Point to the local server
    client = OpenAI(base_url=OPENAI_API_URL, api_key="not-needed")

    #base64_image = f"data:image/jpeg;base64,{get_image()}"

    completion = client.chat.completions.create(
        #model="local-model"
        messages=[
            {
                "role": "system",
                "content": "You are an assistant blind people experience the world. You will provide precise, brief and concise information about what the user is seeing how it can help them.",
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe what you see in the image"},
                    {
                    "type": "image_url",
                    "image_url": {
                        "url": base64_image
                    },
                    },
                ],
            }
        ],
        max_tokens=1000,
        stream=True
    )

    result = ""
    for chunk in completion:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
            result = result + chunk.choices[0].delta.content

    return result

def create_app():
    app = Flask(__name__)

    #CORS(app, resource={r"/*":{ "origins":"*"}})
    CORS(app)
    Compress(app)
        
    @app.route('/')
    def hello():
        return { "result": "hello" }
        
    @app.route('/describe', methods = ['POST'])
    def describe(api="oapi"):
        data = request.json

        if (api=="oapi"):
            print("open ai")
            result = describe_using_openai(data["image"])

        if (api=="replicate" or not result):
            print("replicate")
            result = describe_using_replicate(data["image"])

        return { "result": result, "api": api }

    def log_and_cleanup(result, filename, filepath):
        result=json.loads(result)
        try:
            save_json_to_file(result, filepath + ".json")
        except Exception as e:
            print(f"Error save_json_to_file '{filepath}': {e}")

        try:
            if S3_ENABLED: save_to_bucket(filepath, filename)
        except Exception as e:
            print(f"Error save_to_bucket '{filepath}': {e}")

        try:
            if PURGE_CACHE:
                os.remove(filepath)
                os.remove(filepath + ".json")
        except Exception as e:
            print(f"Error deleting '{filepath}': {e}")

    def handle_file(file, api):
        filename = generate_random_file_name(file.filename)
        filepath = os.path.join("temp", filename)
        file.save(filepath)

        base64_image = file_to_base64_image(filepath, "image/jpg")

        description=""

        if (api=="cloudflare"): description = describe_using_cloudflare(file_to_byte_array(filepath))
        if (api=="oapi"): description = describe_using_openai(base64_image)
        if (api=="replicate" or not description): description = describe_using_replicate(base64_image)

        result = { "name": filename, "created": f"{datetime.now(timezone.utc)}", "result": description, "api": api }

        download_thread = threading.Thread(target=log_and_cleanup, name="Cleanup", args=(json.dumps(result), filename, filepath))
        download_thread.start()

        return result

    @app.route('/upload', methods = ['POST'])
    def upload_file(api="cloudflare"):
        try:
            if request.method == 'POST':
                    if 'file' not in request.files:
                        print('No file part')
                        return { "result": "No file part" }
                    file = request.files['file']
                    if file.filename == '':
                        print('No selected file')
                        return { "result": "no selected file" }
                    if file:
                        print("Got file")
                        result = handle_file(file, api)
                        return result
        except Exception as e:
            print(f"Error uploading file: {e}")
            return { "result": f"Error uploading file: {e}" }



    return app
