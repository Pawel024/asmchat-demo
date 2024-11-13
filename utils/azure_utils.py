import os
import requests
from azure.storage.blob import BlobServiceClient

def list_files_in_directory(directory: str) -> None:
    """Log the list of files in the given directory."""
    if os.path.exists(directory):
        print(f"Files in directory '{directory}':")
        for root, dirs, files in os.walk(directory):
            for file_name in files:
                print(f" - {os.path.join(root, file_name)}")
    else:
        print(f"Directory '{directory}' does not exist.")

def download_file_from_onedrive(onedrive_link: str, local_path: str) -> None:
    """Download a file from OneDrive and save it to the local path."""
    try:
        print(f"Downloading file from OneDrive to '{local_path}'")
        response = requests.get(onedrive_link)
        response.raise_for_status()
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        with open(local_path, 'wb') as file:
            file.write(response.content)
        print(f"Downloading the pdf done!'")
    except requests.RequestException as e:
        raise Exception(f"Error downloading file from OneDrive: {e}")

def download_parsed_data_from_azure(blob_service_client: BlobServiceClient, container_name: str, local_dir: str) -> None:
    """Download parsed data from Azure Blob Storage to the local directory."""
    try:
        print(f"Downloading parsed data from Azure Blob Storage container '{container_name}' to '{local_dir}'")
        list_files_in_directory(local_dir)  # List files before download
        container_client = blob_service_client.get_container_client(container_name)
        blobs = container_client.list_blobs()
        for blob in blobs:
            blob_client = container_client.get_blob_client(blob)
            local_file_path = os.path.join(local_dir, blob.name)
            os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
            print(f"Downloading blob '{blob.name}' to '{local_file_path}'")
            with open(local_file_path, 'wb') as file:
                file.write(blob_client.download_blob().readall())
            print(f"Blob '{blob.name}' downloaded!'")
        list_files_in_directory(local_dir)  # List files after download
    except Exception as e:
        raise Exception(f"Error downloading parsed data from Azure: {e}")

def upload_parsed_data_to_azure(blob_service_client: BlobServiceClient, container_name: str, local_dir: str) -> None:
    """Upload parsed data from the local directory to Azure Blob Storage."""
    try:
        print(f"Uploading parsed data from '{local_dir}' to Azure Blob Storage container '{container_name}'")
        list_files_in_directory(local_dir)  # List files before upload
        container_client = blob_service_client.get_container_client(container_name)
        for root, dirs, files in os.walk(local_dir):
            for file_name in files:
                file_path = os.path.join(root, file_name)
                blob_name = os.path.relpath(file_path, local_dir)
                blob_client = container_client.get_blob_client(blob_name)
                with open(file_path, 'rb') as file:
                    blob_client.upload_blob(file, overwrite=True)
                print(f"File '{file_path}' uploaded as blob '{blob_name}'")
        list_files_in_directory(local_dir)  # List files after upload
    except Exception as e:
        raise Exception(f"Error uploading parsed data to Azure: {e}")