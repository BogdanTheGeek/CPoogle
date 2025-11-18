from googleapiclient.discovery import build
import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
import argparse as ap
import json

parser = ap.ArgumentParser()
parser.add_argument("-o", "--output", help="Output file", default="out/spreadsheet.json")
options = parser.parse_args()


# Authenticate and build the Google Drive service
def authenticate_google_sheets():
    SCOPES = ["https://www.googleapis.com/auth/drive","https://www.googleapis.com/auth/spreadsheets.readonly"]

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

    return build("sheets", "v4", credentials=creds)

def get_spreadsheet_range(spreadsheet_id, range_name):
    service = authenticate_google_sheets()
    sheet = service.spreadsheets()
    values = sheet.values().get(spreadsheetId=spreadsheet_id, range=range_name).execute().get("values", [])
    print(f"Fetched {len(values)} models")

    max_columns = 8
    formatted_values = {}

    for model in values:
        # replace any empty strings with "Unknown"
        model = [field if field != "" else "Unknown" for field in model]
        #google sheets api does not return empty trailing columns, so we need to fill them
        if len(model) < max_columns:
            model += ["Unknown"] * (max_columns - len(model))
        
        formatted_values[model[0]] = {
            "designer": model[1],
            "model_name": model[2],
            "crease_pattern_file": model[3],
            "additional_resources": model[4],
            "social_link": model[5],
            "design_style": model[6],
            "paper_shape": model[7]
        }

    with open(options.output, "w") as file:
        json.dump(formatted_values, file, separators=(",", ":"), indent=0)

if __name__ == '__main__':
    spreadsheet_id = "1KlqOwdtCF1eCltRjat4LO1ItcXjAjVKLuLxk206r4C4"
    range_name = "Data!A2:H"

    get_spreadsheet_range(spreadsheet_id, range_name)
