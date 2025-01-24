#!/usr/bin/env python3
import os
import pickle
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import json
from multiprocessing import Pool
from tqdm import tqdm
import argparse as ap


parser = ap.ArgumentParser()
parser.add_argument("-o", "--output", help="Output file", default="out/records.json")
parser.add_argument(
    "-j", "--jobs", type=int, help="Number of parallel jobs", default=None
)
options = parser.parse_args()


# Authenticate and build the Google Drive service
def authenticate_google_drive():
    SCOPES = ["https://www.googleapis.com/auth/drive"]

    creds = None
    # Use a saved token if it exists
    if os.path.exists("token.pickle"):
        with open("token.pickle", "rb") as token:
            creds = pickle.load(token)

    # If no valid credentials, request new authorization
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for future use
        with open("token.pickle", "wb") as token:
            pickle.dump(creds, token)

    return build("drive", "v3", credentials=creds)


# List folders directly under a specific parent folder
def list_folders_one_level(drive_service, parent_folder_id):
    query = f"'{parent_folder_id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results = (
        drive_service.files()
        .list(q=query, fields="files(id, name)", pageSize=1000)
        .execute()
    )
    nextPageToken = results.get("nextPageToken")
    folders = results.get("files", [])

    while nextPageToken:
        results = (
            drive_service.files()
            .list(
                q=query,
                fields="files(id, name)",
                pageSize=1000,
                pageToken=nextPageToken,
            )
            .execute()
        )
        folders.extend(results.get("files", []))
        nextPageToken = results.get("nextPageToken")
    return folders


# List files in a specific folder
def list_files_in_folder(drive_service, folder_id):
    query = f"'{folder_id}' in parents and trashed = false"
    results = (
        drive_service.files()
        .list(
            q=query, fields="files(id, name, mimeType)", pageSize=20
        )  # NOTE: please don't reach this limit
        .execute()
    )
    files = results.get("files", [])
    return files


def get_author_designs(args):
    drive_service, author = args
    designs = list_files_in_folder(drive_service, author["id"])
    for design in designs:
        if design["mimeType"] == "application/vnd.google-apps.folder":
            design["files"] = list_files_in_folder(drive_service, design["id"])
    obj = {
        author["id"]: {
            "name": author["name"],
            "designs": designs,
        },
    }
    return obj


# Main function to scan a Google Drive folder
def scan_google_drive(parent_folder_id):
    drive_service = authenticate_google_drive()

    # List folders at the first level
    authors = list_folders_one_level(drive_service, parent_folder_id)
    print(f"Found {len(authors)} subfolders in the parent folder:\n")

    records = []
    with tqdm(total=len(authors)) as bar:
        with Pool(options.jobs) as pool:
            args = [(drive_service, author) for author in authors]
            # records = pool.starmap(get_author_designs, args)
            for result in pool.imap_unordered(get_author_designs, args):
                records.append(result)
                bar.update()

    # Write the records to a JSON file
    with open(options.output, "w") as file:
        for record in records:
            file.write(json.dumps(record, separators=(",", ":")) + "\n")


# Replace this with your shared Google Drive folder's ID
if __name__ == "__main__":
    # Set the parent folder ID (replace with your shared folder's ID)
    parent_folder_id = "1MHjPTELf05Yop-nodriYR7z97hCw1kpB"

    # Call the main scanning function
    scan_google_drive(parent_folder_id)
