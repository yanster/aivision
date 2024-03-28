import os
import json
import uuid
import base64

def save_json_to_file(data, file_path):
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Data successfully saved to {file_path}")
    except Exception as e:
        print(f"Error saving JSON to file: {e}")

def file_to_base64_image(file_path, mime_type):
    # Read the file's binary content
    with open(file_path, 'rb') as image_file:
        encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
    
    # Format as a data URL
    data_url = f'data:{mime_type};base64,{encoded_string}'
    
    return data_url

def file_to_byte_array(file_path):
    # Read the file's binary content
    with open(file_path, 'rb') as image_file:
        ba = bytearray(image_file.read())
    
    return ba

def generate_random_file_name(original_file_name):
    # Extract the extension from the original file name
    _, extension = os.path.splitext(original_file_name)
    
    # Generate a random UUID for the new file name
    random_file_name = str(uuid.uuid4()) + extension
    
    return random_file_name