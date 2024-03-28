import os
from dotenv import load_dotenv
load_dotenv()

import boto3

def save_to_bucket(filepath, filename): 

    aws_access_key_id = os.getenv('S3_KEY')
    aws_secret_access_key = os.getenv('S3_SECRET')
    s3_endpoint_url = os.getenv('S3_ENDPOINT')

    # Create an S3 session using boto3
    session = boto3.session.Session()
    s3 = session.resource(service_name='s3',
                        aws_access_key_id=aws_access_key_id,
                        aws_secret_access_key=aws_secret_access_key,
                        endpoint_url=s3_endpoint_url,
                        verify=False)

    bucket_name = 'voicesight'

    s3.Bucket(bucket_name).upload_file(Filename=filepath, Key=filename)
    s3.Bucket(bucket_name).upload_file(Filename=filepath + ".json", Key=filename + ".json")

    return True
