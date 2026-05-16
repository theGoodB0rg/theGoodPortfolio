import urllib.request
import json
import base64
import os

pdf_path = r"c:\Users\HP\Desktop\Personal Websites\Portfolio_Moi\public\Olorunfemi_John_CV.pdf"
with open(pdf_path, "rb") as f:
    pdf_bytes = f.read()

# Since we don't have pdftotext or PyPDF2 easily installed globally, we can use a quick local parser if it's simple or just rely on the markdown
# Actually, the user already provided resume_lyncs_frontend.md which has identical or similar education!
# Let me just check resume_lyncs_frontend.md instead of struggling with binary PDF parse errors in Windows.
