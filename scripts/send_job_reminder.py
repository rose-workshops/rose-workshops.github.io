#!/usr/bin/env python3

import csv
import os
import smtplib
import ssl
import sys
from email.message import EmailMessage
from io import StringIO
from urllib.request import urlopen


SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/16yOVtD0XPcVht58jxOES8VYuxC-KwfY1I-D4J1TjyeU/export?format=csv&gid=242872713"
SHEET_URL = "https://docs.google.com/spreadsheets/d/16yOVtD0XPcVht58jxOES8VYuxC-KwfY1I-D4J1TjyeU/edit"

APPROVED_HEADER = "Approved"
DEADLINE_HEADER = "Deadline"
TITLE_HEADER = "Title (very short job description)"
INSTITUTION_HEADER = "Institution / Company"
LOCATION_HEADER = "Location(s)"
URL_HEADER = "URL to detailed job posting "

YES_VALUES = {"approved", "true", "yes", "y", "1"}
NO_VALUES = {"rejected", "false", "no", "n", "0"}


def getenv(name, default=None):
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value


def read_rows(sheet_csv_url):
    with urlopen(sheet_csv_url, timeout=30) as response:
        csv_text = response.read().decode("utf-8-sig")
    return list(csv.DictReader(StringIO(csv_text)))


def normalized(value):
    return (value or "").strip().lower()


def valid_deadline(value):
    value = (value or "").strip()
    if len(value) != 10:
        return False
    year, month, day = value.split("-") if value.count("-") == 2 else ("", "", "")
    return len(year) == 4 and len(month) == 2 and len(day) == 2 and year.isdigit() and month.isdigit() and day.isdigit()


def pending_rows(rows):
    pending = []
    for row in rows:
        approved = normalized(row.get(APPROVED_HEADER))
        deadline = row.get(DEADLINE_HEADER, "")

        if approved not in YES_VALUES and approved not in NO_VALUES:
            pending.append(row)
        elif approved in YES_VALUES and not valid_deadline(deadline):
            pending.append(row)

    return pending


def row_summary(row, index):
    title = (row.get(TITLE_HEADER) or "(no title)").strip()
    institution = (row.get(INSTITUTION_HEADER) or "(no institution)").strip()
    location = (row.get(LOCATION_HEADER) or "").strip()
    url = (row.get(URL_HEADER) or "").strip()

    parts = [
        f"{index}. {title}",
        f"   Institution / Company: {institution}",
    ]
    if location:
        parts.append(f"   Location(s): {location}")
    if url:
        parts.append(f"   Job advert: {url}")
    return "\n".join(parts)


def build_message(rows, sheet_url, sender, recipients):
    count = len(rows)
    entry_word = "advert" if count == 1 else "adverts"
    verb = "is" if count == 1 else "are"
    summaries = "\n\n".join(row_summary(row, index) for index, row in enumerate(rows, start=1))

    body = f"""There {verb} {count} job {entry_word} awaiting review.

Please open the response sheet and fill in:

Approved
- yes: publish the advert on the website
- no: keep the advert hidden

Deadline
- use YYYY-MM-DD
- required for approved adverts
- the advert remains visible through that date

Pending entries:

{summaries}

Sheet:
{sheet_url}
"""

    message = EmailMessage()
    message["From"] = sender
    message["To"] = ", ".join(recipients)
    message["Subject"] = f"{count} RoSE job {entry_word} awaiting review"
    message.set_content(body)
    return message


def send_message(message):
    host = getenv("JOB_SMTP_HOST", "smtp.gmail.com")
    port = int(getenv("JOB_SMTP_PORT", "587"))
    username = getenv("JOB_SMTP_USERNAME")
    password = getenv("JOB_SMTP_PASSWORD")

    if not username or not password:
        raise RuntimeError("JOB_SMTP_USERNAME and JOB_SMTP_PASSWORD must be set")

    context = ssl.create_default_context()
    with smtplib.SMTP(host, port, timeout=30) as smtp:
        smtp.starttls(context=context)
        smtp.login(username, password)
        smtp.send_message(message)


def main():
    recipients = [recipient.strip() for recipient in getenv("JOB_REMINDER_RECIPIENTS", "").split(",") if recipient.strip()]
    if not recipients:
        raise RuntimeError("JOB_REMINDER_RECIPIENTS must be set")

    rows = read_rows(getenv("JOB_SHEET_CSV_URL", SHEET_CSV_URL))
    pending = pending_rows(rows)
    if not pending:
        print("No pending job adverts.")
        return 0

    sender = getenv("JOB_SMTP_FROM", getenv("JOB_SMTP_USERNAME", "rose.workshop.org@gmail.com"))
    message = build_message(pending, getenv("JOB_SHEET_URL", SHEET_URL), sender, recipients)

    if getenv("JOB_REMINDER_DRY_RUN", "").lower() in {"1", "true", "yes"}:
        print(message.as_string())
        return 0

    send_message(message)
    print(f"Sent reminder for {len(pending)} pending job advert(s).")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
