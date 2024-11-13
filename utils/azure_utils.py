import os
import requests
import logging
from azure.storage.blob import BlobServiceClient

def download_file_from_onedrive(onedrive_link: str, local_path: str) -> None:
    """Download a file from OneDrive and save it to the local path."""
    try:
        logging.info(f"Downloading file from OneDrive to '{local_path}'")
        response = requests.get(onedrive_link)
        response.raise_for_status()
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'wb') as file:
            file.write(response.content)
        logging.info(f"Downloaded file from OneDrive to '{local_path}'")
    except requests.RequestException as e:
        logging.error(f"Error downloading file from OneDrive: {e}")

def download_parsed_data_from_azure(blob_service_client: BlobServiceClient, container_name: str, local_dir: str) -> None:
    """Download parsed data from Azure Blob Storage to the local directory."""
    try:
        logging.info(f"Downloading parsed data from Azure Blob Storage container '{container_name}' to '{local_dir}'")
        container_client = blob_service_client.get_container_client(container_name)
        blobs = container_client.list_blobs()
        for blob in blobs:
            blob_client = container_client.get_blob_client(blob)
            local_file_path = os.path.join(local_dir, blob.name)
            os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
            with open(local_file_path, 'wb') as file:
                file.write(blob_client.download_blob().readall())
            logging.info(f"Downloaded blob '{blob.name}' to '{local_file_path}'")
    except Exception as e:
        logging.error(f"Error downloading parsed data from Azure: {e}")

def upload_parsed_data_to_azure(blob_service_client: BlobServiceClient, container_name: str, local_dir: str) -> None:
    """Upload parsed data from the local directory to Azure Blob Storage."""
    try:
        logging.info(f"Uploading parsed data from '{local_dir}' to Azure Blob Storage container '{container_name}'")
        container_client = blob_service_client.get_container_client(container_name)
        for root, dirs, files in os.walk(local_dir):
            for file_name in files:
                file_path = str(os.path.join(root, file_name))
                blob_name = str(os.path.relpath(file_path, local_dir))
                blob_client = container_client.get_blob_client(blob_name)
                with open(file_path, 'rb') as file:
                    blob_client.upload_blob(file, overwrite=True)
                logging.info(f"Uploaded file '{file_path}' as blob '{blob_name}'")
    except Exception as e:
        logging.error(f"Error uploading parsed data to Azure: {e}")